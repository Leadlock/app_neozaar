/**
 * AWS Marketplace — Catalog API client.
 * https://docs.aws.amazon.com/marketplace-catalog/latest/api-reference/welcome.html
 *
 * The Catalog API is how a registered seller creates and updates product listings
 * programmatically. Work is submitted as a "change set" (an array of change objects)
 * via StartChangeSet; the call is asynchronous and returns a ChangeSetId that is
 * polled with DescribeChangeSet. This is the AWS analogue of the Azure Product
 * Ingestion API's POST /configure + job polling.
 *
 * All credentials are read from process.env — never exposed to the frontend.
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID       — IAM user "Neozaar_AWS_Marketplace"
 *   AWS_SECRET_ACCESS_KEY   — its access key secret
 *
 * Fixed constants (overridable only for tests):
 *   AWS_MP_REGION   — must be us-east-1 (the Catalog API runs there only)
 *   AWS_MP_CATALOG  — must be AWSMarketplace (the only catalog value today)
 *
 * Informational:
 *   AWS_MP_SELLER_ID / AWS_MP_SELLER_ARN — this account's seller identity. The API is
 *   scoped by the authenticated IAM identity, so these are used for display only.
 */

const {
  MarketplaceCatalogClient,
  StartChangeSetCommand,
  DescribeChangeSetCommand,
  DescribeEntityCommand,
  ListEntitiesCommand,
  ListChangeSetsCommand,
  CancelChangeSetCommand,
} = require('@aws-sdk/client-marketplace-catalog');

const REGION = process.env.AWS_MP_REGION || 'us-east-1';
const CATALOG = process.env.AWS_MP_CATALOG || 'AWSMarketplace';
const SELLER_ID = process.env.AWS_MP_SELLER_ID || null;
const SELLER_ARN = process.env.AWS_MP_SELLER_ARN || null;

// ---------------------------------------------------------------------------
// Internal: a single lazily-created client. SigV4 signs every request, so there
// is no token to cache (unlike the Azure OAuth client).
// ---------------------------------------------------------------------------
let _client = null;

function client() {
  if (_client) return _client;
  _client = new MarketplaceCatalogClient({
    region: REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return _client;
}

/**
 * True if the AWS credentials are present (does not validate them).
 */
function credentialsConfigured() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

// ---------------------------------------------------------------------------
// Internal: normalise an AWS SDK v3 error into something worth logging / storing.
// SDK errors carry: .name (e.g. "ValidationException", "ResourceInUseException"),
// .$metadata.httpStatusCode, .$fault ("client" | "server"), .message.
// ---------------------------------------------------------------------------
function wrapApiError(err, operation) {
  const httpStatus = err?.$metadata?.httpStatusCode || null;
  const code = err?.name || err?.code || 'UnknownError';
  const wrapped = new Error(
    `AWS Marketplace Catalog API ${operation} failed` +
      (httpStatus ? ` (HTTP ${httpStatus})` : '') +
      `: ${code}` +
      (err?.message ? ` — ${err.message}` : '')
  );
  wrapped.status = httpStatus;
  wrapped.awsErrorCode = code;          // service layer checks this (e.g. ResourceInUseException)
  wrapped.awsFault = err?.$fault || null;
  wrapped.awsRequest = { operation, catalog: CATALOG, region: REGION };
  wrapped.awsResponse = {
    name: code,
    message: err?.message || null,
    requestId: err?.$metadata?.requestId || null,
  };
  wrapped.cause = err;
  return wrapped;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit a change set to create / update / release a listing.
 * POST StartChangeSet
 *
 * @param {Array<object>} changeSet - array of change objects. Each:
 *   { ChangeType, ChangeName?, Entity: { Type, Identifier? },
 *     DetailsDocument?: object,  // preferred
 *     Details?: string }         // JSON string (older form)
 * @param {object} [opts]
 * @param {string} [opts.changeSetName]     - human label shown in the AMMP change-set history
 * @param {string} [opts.clientRequestToken] - idempotency token (safe retry of the same submit)
 * @param {boolean} [opts.validateOnly]     - Intent=VALIDATE: dry-run, nothing is applied
 * @returns {Promise<{ changeSetId: string, changeSetArn: string }>}
 */
async function startChangeSet(changeSet, opts = {}) {
  if (!Array.isArray(changeSet) || changeSet.length === 0) {
    throw Object.assign(new Error('startChangeSet: changeSet must be a non-empty array.'), { status: 400 });
  }
  const input = {
    Catalog: CATALOG,
    ChangeSet: changeSet,
  };
  if (opts.changeSetName) input.ChangeSetName = opts.changeSetName;
  if (opts.clientRequestToken) input.ClientRequestToken = opts.clientRequestToken;
  if (opts.validateOnly) input.Intent = 'VALIDATE';

  try {
    const out = await client().send(new StartChangeSetCommand(input));
    return { changeSetId: out.ChangeSetId, changeSetArn: out.ChangeSetArn };
  } catch (err) {
    throw wrapApiError(err, 'StartChangeSet');
  }
}

/**
 * Poll the status of a change set.
 * GET DescribeChangeSet
 *
 * @param {string} changeSetId
 * @returns {Promise<{
 *   status: string,          // PREPARING | APPLYING | SUCCEEDED | CANCELLED | FAILED
 *   failureCode: string|null,
 *   failureDescription: string|null,
 *   startTime: string|null,
 *   endTime: string|null,
 *   changes: Array<object>,  // per-change entries incl. resolved Entity.Identifier
 *   errors: Array<{ code: string, message: string, changeType: string }>,
 *   raw: object,
 * }>}
 */
async function describeChangeSet(changeSetId) {
  try {
    const out = await client().send(
      new DescribeChangeSetCommand({ Catalog: CATALOG, ChangeSetId: changeSetId })
    );
    const changes = out.ChangeSet || [];
    const errors = changes.flatMap((c) =>
      (c.ErrorDetailList || []).map((e) => ({
        code: e.ErrorCode,
        message: e.ErrorMessage,
        changeType: c.ChangeType,
      }))
    );
    return {
      status: out.Status || null,
      failureCode: out.FailureCode || null,
      failureDescription: out.FailureDescription || null,
      startTime: out.StartTime ? new Date(out.StartTime).toISOString() : null,
      endTime: out.EndTime ? new Date(out.EndTime).toISOString() : null,
      changes,
      errors,
      raw: out,
    };
  } catch (err) {
    throw wrapApiError(err, 'DescribeChangeSet');
  }
}

/**
 * List change sets, optionally filtered to one entity — used to detect an already
 * in-flight change set before submitting a new one (AWS rejects concurrent
 * change sets on the same entity).
 *
 * @param {object} [opts]
 * @param {string} [opts.entityId]  - restrict to change sets touching this entity
 * @param {string[]} [opts.statuses] - e.g. ['PREPARING','APPLYING']
 * @returns {Promise<Array<{ changeSetId, changeSetName, status, startTime, endTime }>>}
 */
async function listChangeSets(opts = {}) {
  const input = { Catalog: CATALOG, MaxResults: 20 };
  const filters = [];
  if (opts.entityId) filters.push({ Name: 'EntityId', ValueList: [opts.entityId] });
  if (opts.statuses && opts.statuses.length) {
    filters.push({ Name: 'Status', ValueList: opts.statuses });
  }
  if (filters.length) input.FilterList = filters;

  try {
    const out = await client().send(new ListChangeSetsCommand(input));
    return (out.ChangeSetSummaryList || []).map((s) => ({
      changeSetId: s.ChangeSetId,
      changeSetName: s.ChangeSetName,
      status: s.Status,
      startTime: s.StartTime ? new Date(s.StartTime).toISOString() : null,
      endTime: s.EndTime ? new Date(s.EndTime).toISOString() : null,
      entityIdList: s.EntityIdList || [],
    }));
  } catch (err) {
    throw wrapApiError(err, 'ListChangeSets');
  }
}

/**
 * True if the given entity currently has a change set that is still running.
 */
async function hasRunningChangeSet(entityId) {
  if (!entityId) return false;
  const running = await listChangeSets({
    entityId,
    statuses: ['PREPARING', 'APPLYING'],
  });
  return running.length > 0;
}

/**
 * Read a single entity's full detail (the resolved listing after a change set).
 * GET DescribeEntity
 *
 * @param {string} entityId - the EntityId (or EntityArn)
 * @returns {Promise<{ entityType, entityId, entityArn, lastModified, details: object, raw: object }>}
 */
async function describeEntity(entityId) {
  try {
    const out = await client().send(
      new DescribeEntityCommand({ Catalog: CATALOG, EntityId: entityId })
    );
    let details = null;
    if (out.DetailsDocument !== undefined) details = out.DetailsDocument;
    else if (out.Details) {
      try { details = JSON.parse(out.Details); } catch { details = out.Details; }
    }
    return {
      entityType: out.EntityType || null,
      entityId: out.EntityIdentifier || null,
      entityArn: out.EntityArn || null,
      lastModified: out.LastModifiedDate ? new Date(out.LastModifiedDate).toISOString() : null,
      details,
      raw: out,
    };
  } catch (err) {
    throw wrapApiError(err, 'DescribeEntity');
  }
}

/**
 * List entities of a type for this seller — used to find an existing product by
 * title before creating a duplicate.
 * GET ListEntities
 *
 * @param {string} [entityType='SaaSProduct'] - SaaSProduct | AmiProduct | ContainerProduct | Offer
 * @param {object} [opts]
 * @param {string} [opts.nameContains] - client-side filter on the summary Name
 * @returns {Promise<Array<{ name, entityId, entityArn, visibility, lastModified }>>}
 */
async function listEntities(entityType = 'SaaSProduct', opts = {}) {
  const results = [];
  let nextToken;
  try {
    do {
      const out = await client().send(
        new ListEntitiesCommand({
          Catalog: CATALOG,
          EntityType: entityType,
          MaxResultCount: 50,
          NextToken: nextToken,
        })
      );
      for (const s of out.EntitySummaryList || []) {
        if (opts.nameContains && !(s.Name || '').toLowerCase().includes(opts.nameContains.toLowerCase())) {
          continue;
        }
        results.push({
          name: s.Name || null,
          entityId: s.EntityId || null,
          entityArn: s.EntityArn || null,
          visibility: s.Visibility || null,
          lastModified: s.LastModifiedDate ? new Date(s.LastModifiedDate).toISOString() : null,
        });
      }
      nextToken = out.NextToken;
    } while (nextToken);
    return results;
  } catch (err) {
    throw wrapApiError(err, 'ListEntities');
  }
}

/**
 * Cancel a change set that is still PREPARING / APPLYING.
 * POST CancelChangeSet
 */
async function cancelChangeSet(changeSetId) {
  try {
    const out = await client().send(
      new CancelChangeSetCommand({ Catalog: CATALOG, ChangeSetId: changeSetId })
    );
    return { changeSetId: out.ChangeSetId, changeSetArn: out.ChangeSetArn };
  } catch (err) {
    throw wrapApiError(err, 'CancelChangeSet');
  }
}

module.exports = {
  catalog: CATALOG,
  region: REGION,
  sellerId: SELLER_ID,
  sellerArn: SELLER_ARN,
  credentialsConfigured,
  startChangeSet,
  describeChangeSet,
  listChangeSets,
  hasRunningChangeSet,
  describeEntity,
  listEntities,
  cancelChangeSet,
};
