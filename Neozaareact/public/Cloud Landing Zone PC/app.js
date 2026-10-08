const catalog = {
  identity: { name: "Identity & Privileged Access", hours: 15, USD: 975, INR: 93000 },
  pipeline: { name: "Platform Automation & IaC", hours: 25, USD: 1625, INR: 155000 },
  network: { name: "Additional VPC / VNet Spoke", hours: 10, USD: 650, INR: 62000 },
  monitoring: { name: "Centralized Operations & Observability", hours: 15, USD: 975, INR: 93000 },
  compliance: { name: "Governance & Security Guardrails", hours: 20, USD: 1300, INR: 124000 },
  cost: { name: "Cost Management & Resource Standards", hours: 10, USD: 650, INR: 62000 },
  vending: { name: "Account / Subscription Vending", hours: 20, USD: 1300, INR: 124000 },
  security: { name: "Threat Detection & SIEM Integration", hours: 20, USD: 1300, INR: 124000 },
  backup: { name: "Backup & Recovery Foundation", hours: 15, USD: 975, INR: 93000 },
  hybrid: { name: "Hybrid Connectivity", hours: 25, USD: 1625, INR: 155000 },
  database: { name: "Database Setup & Configuration", hours: 20, USD: 1300, INR: 124000 },
};

const base = { name: "Base landing zone", hours: 40, USD: 2600, INR: 248000 };
const baselineKeys = ["identity", "pipeline", "monitoring", "compliance", "cost"];
const platformContent = {
  AWS: {
    baseName: "AWS landing zone",
    baseTitle: "AWS Multi-Account Landing Zone",
    baseDescription: "The organization, shared security accounts, and first workload environment.",
    deliverables: [
      "AWS Organizations, Control Tower & OU hierarchy",
      "Management, Log Archive & Audit accounts",
      "1 workload account with VPC & DNS baseline",
      "Naming, tagging & ownership conventions",
    ],
    networkTitle: "Additional VPC Spoke",
    services: {
      identity: "IAM Identity Center, federation, MFA, permission sets, and break-glass access",
      pipeline: "Terraform / CloudFormation pipeline, S3 state, change review, and drift controls",
      network: "VPC, Transit Gateway routing, route tables, and NACLs",
      monitoring: "Organization CloudTrail and Config aggregation, CloudWatch alarms, and SNS routing",
      compliance: "Control Tower controls, SCPs, AWS Config rules, Security Hub, and CIS baseline",
      cost: "Cost Explorer, budgets, cost allocation tags, account ownership, and anomaly alerts",
      vending: "Account Factory workflow with approved blueprints, OUs, controls, and network defaults",
      security: "GuardDuty, Security Hub delegated administration, findings aggregation, and SIEM integration",
      backup: "AWS Backup policies, cross-account vaults, retention standards, and restore testing",
      hybrid: "Site-to-Site VPN or Direct Connect, Transit Gateway routing, and Route 53 Resolver",
      database: "RDS / Aurora, private access, KMS encryption, and backups",
    },
  },
  Azure: {
    baseName: "Azure landing zone",
    baseTitle: "Azure Multi-Subscription Landing Zone",
    baseDescription: "The tenant hierarchy, core platform subscriptions, and first application landing zone.",
    deliverables: [
      "Tenant & management-group hierarchy",
      "Management, Connectivity & Identity subscriptions",
      "1 application subscription with VNet & DNS baseline",
      "Naming, tagging & ownership conventions",
    ],
    networkTitle: "Additional VNet Spoke",
    services: {
      identity: "Microsoft Entra ID, RBAC, PIM, Conditional Access, MFA, and emergency access",
      pipeline: "Terraform / Bicep pipeline, Azure Storage state, change review, and drift controls",
      network: "VNet, hub-spoke peering, route tables, and NSGs",
      monitoring: "Azure Monitor, Log Analytics, Activity Logs, alerts, and Action Groups",
      compliance: "Azure Policy initiatives, Defender for Cloud, security baseline, and CIS controls",
      cost: "Cost Management scopes, budgets, tags, ownership, and anomaly alerts",
      vending: "Subscription vending workflow with approved archetypes, policies, RBAC, and network defaults",
      security: "Microsoft Sentinel, Defender for Cloud integrations, analytics rules, and incident routing",
      backup: "Azure Backup policies, Recovery Services vaults, retention standards, and restore testing",
      hybrid: "Site-to-Site VPN or ExpressRoute, hub routing, Private DNS, and Azure Firewall integration",
      database: "Azure SQL / PostgreSQL, private access, encryption, and backups",
    },
  },
};
const state = { currency: "USD", platform: "AWS", spokes: 1 };

const checkboxes = [...document.querySelectorAll(".addon-checkbox")];
const currencyButtons = [...document.querySelectorAll("[data-currency]")];
const platformButtons = [...document.querySelectorAll("[data-platform]")];
const totalPrice = document.querySelector("#total-price");
const totalHours = document.querySelector("#total-hours");
const lineItems = document.querySelector("#line-items");
const spokeCount = document.querySelector("#spoke-count");
const rateCaption = document.querySelector("#rate-caption");
const coverageStatus = document.querySelector("#coverage-status");
const coverageBlock = document.querySelector("#coverage-block");
const planningHours = document.querySelector("#planning-hours");
const calendarWeeks = document.querySelector("#calendar-weeks");

function money(value, currency = state.currency) {
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function selectedConfiguration() {
  return checkboxes
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => {
      const key = checkbox.dataset.addon;
      const quantity = key === "network" ? state.spokes : 1;
      return { key, quantity, ...catalog[key] };
    });
}

function totals() {
  return selectedConfiguration().reduce(
    (sum, item) => ({
      hours: sum.hours + item.hours * item.quantity,
      USD: sum.USD + item.USD * item.quantity,
      INR: sum.INR + item.INR * item.quantity,
    }),
    { hours: base.hours, USD: base.USD, INR: base.INR },
  );
}

function planningRange(hours) {
  const roundToFive = (value) => Math.max(5, Math.round(value / 5) * 5);
  const low = roundToFive(hours * 0.92);
  const high = roundToFive(hours * 1.16);
  const minWeeks = Math.max(1, Math.ceil(low / 40));
  const maxWeeks = Math.max(minWeeks, Math.ceil(high / 30));
  return { low, high, minWeeks, maxWeeks };
}

function render() {
  const selected = selectedConfiguration();
  const total = totals();
  const range = planningRange(total.hours);
  const platform = platformContent[state.platform];
  const covered = baselineKeys.filter((key) => document.querySelector(`[data-addon="${key}"]`).checked).length;

  totalPrice.textContent = money(total[state.currency]);
  totalHours.textContent = total.hours;
  planningHours.textContent = `${range.low}–${range.high} hours`;
  calendarWeeks.textContent = `${range.minWeeks}–${range.maxWeeks} ${range.maxWeeks === 1 ? "week" : "weeks"}`;
  spokeCount.textContent = state.spokes;
  rateCaption.textContent = state.currency === "USD" ? "at $65 per hour" : "at ₹6,200 per hour";
  document.querySelector("[data-base-price]").textContent = money(base[state.currency]);
  document.querySelector("#base-title").textContent = platform.baseTitle;
  document.querySelector("#base-description").textContent = platform.baseDescription;
  document.querySelector("#network-title").textContent = platform.networkTitle;
  coverageStatus.textContent = `${covered + 1} / ${baselineKeys.length + 1} covered`;
  coverageBlock.classList.toggle("complete", covered === baselineKeys.length);
  document.querySelectorAll("[data-base-deliverable]").forEach((item) => {
    item.textContent = platform.deliverables[Number(item.dataset.baseDeliverable)];
  });
  Object.entries(platform.services).forEach(([key, description]) => {
    document.querySelector(`[data-service="${key}"]`).textContent = description;
  });

  Object.entries(catalog).forEach(([key, item]) => {
    document.querySelector(`[data-price="${key}"]`).textContent = money(item[state.currency]);
  });

  lineItems.innerHTML = `
    <div class="line-item base-line"><span>${platform.baseName}</span><strong>${money(base[state.currency])}</strong></div>
    ${selected.map((item) => `
      <div class="line-item">
        <span>${item.name}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
        <strong>${money(item[state.currency] * item.quantity)}</strong>
      </div>
    `).join("")}
  `;

  currencyButtons.forEach((button) => {
    const active = button.dataset.currency === state.currency;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  platformButtons.forEach((button) => {
    const active = button.dataset.platform === state.platform;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setAddons(keys, spokes = state.spokes) {
  const chosen = new Set(keys);
  checkboxes.forEach((checkbox) => { checkbox.checked = chosen.has(checkbox.dataset.addon); });
  state.spokes = Math.max(1, Math.min(20, Number(spokes) || 1));
  render();
}

checkboxes.forEach((checkbox) => checkbox.addEventListener("change", render));

currencyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.currency = button.dataset.currency;
    render();
  });
});

platformButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.platform = button.dataset.platform;
    render();
  });
});

document.querySelector("#spoke-minus").addEventListener("click", () => {
  state.spokes = Math.max(1, state.spokes - 1);
  render();
});

document.querySelector("#spoke-plus").addEventListener("click", () => {
  state.spokes = Math.min(20, state.spokes + 1);
  document.querySelector("#network").checked = true;
  render();
});

document.querySelector("#clear-addons").addEventListener("click", () => setAddons([], 1));
document.querySelector("#baseline-preset").addEventListener("click", () => setAddons(baselineKeys, 1));

function registerWebMcpTools() {
  const context = document.modelContext;
  if (!context?.registerTool) return;

  const register = (tool) => {
    try { Promise.resolve(context.registerTool(tool)).catch(() => {}); } catch (_) {}
  };

  register({
    name: "read_landing_zone_estimate",
    title: "Read landing zone estimate",
    description: "Read the currently selected landing zone modules, total effort, and price.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute() {
      const total = totals();
      const range = planningRange(total.hours);
      return {
        currency: state.currency,
        platform: state.platform,
        selectedModules: selectedConfiguration().map(({ key, name, quantity }) => ({ key, name, quantity })),
        totalHours: total.hours,
        totalPrice: total[state.currency],
        baselineCoverage: `${baselineKeys.filter((key) => document.querySelector(`[data-addon="${key}"]`).checked).length + 1}/${baselineKeys.length + 1}`,
        planningRangeHours: { low: range.low, high: range.high },
        estimatedCalendarWeeks: { low: range.minWeeks, high: range.maxWeeks },
      };
    },
  });

  register({
    name: "configure_landing_zone_estimate",
    title: "Configure landing zone estimate",
    description: "Select landing zone add-ons, set the network spoke quantity, and update the visible estimate.",
    inputSchema: {
      type: "object",
      properties: {
        addOns: { type: "array", items: { type: "string", enum: Object.keys(catalog) }, uniqueItems: true },
        networkSpokes: { type: "integer", minimum: 1, maximum: 20 },
        currency: { type: "string", enum: ["USD", "INR"] },
        platform: { type: "string", enum: ["AWS", "Azure"] },
      },
      required: ["addOns"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    execute(input) {
      if (!input || !Array.isArray(input.addOns) || input.addOns.some((key) => !catalog[key])) {
        throw new Error("addOns must contain valid catalog keys.");
      }
      if (input.currency && !["USD", "INR"].includes(input.currency)) throw new Error("Unsupported currency.");
      if (input.platform && !["AWS", "Azure"].includes(input.platform)) throw new Error("Unsupported cloud platform.");
      if (input.networkSpokes !== undefined && (!Number.isInteger(input.networkSpokes) || input.networkSpokes < 1 || input.networkSpokes > 20)) {
        throw new Error("networkSpokes must be an integer from 1 to 20.");
      }
      if (input.currency) state.currency = input.currency;
      if (input.platform) state.platform = input.platform;
      setAddons(input.addOns, input.networkSpokes ?? state.spokes);
      const total = totals();
      const range = planningRange(total.hours);
      return {
        totalHours: total.hours,
        planningRangeHours: { low: range.low, high: range.high },
        estimatedCalendarWeeks: { low: range.minWeeks, high: range.maxWeeks },
        totalPrice: total[state.currency],
        currency: state.currency,
        platform: state.platform,
      };
    },
  });
}

render();
registerWebMcpTools();
