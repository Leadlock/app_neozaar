import jwt from 'jsonwebtoken';
import { performAgentAction, AgentError } from '../../../../lib/agentActions.js';

export const runtime = 'nodejs';

// Private bridge for the Express inbox API. Uses the same existing portal JWT,
// never a browser-supplied agent identity or a second WhatsApp credential.
export async function POST(req, context) {
  if (!process.env.JWT_SECRET) return Response.json({ message: 'Agent bridge is not configured' }, { status: 503 });
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return Response.json({ message: 'Authentication required' }, { status: 401 });
  let user;
  try { user = jwt.verify(authorization.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { return Response.json({ message: 'Invalid token' }, { status: 401 }); }
  if (user.role_type !== 'SUPER_ADMIN') return Response.json({ message: 'SUPER_ADMIN access required' }, { status: 403 });
  try {
    const { phone, action } = await context.params;
    let body;
    try { body = await req.json(); } catch { throw new AgentError(400, 'Valid JSON required'); }
    const data = await performAgentAction(phone, action, body, user);
    return Response.json({ status: 'success', data });
  } catch (error) {
    if (!(error instanceof AgentError)) console.error('WhatsApp agent action failed:', error.message);
    return Response.json({ status: 'fail', message: error instanceof AgentError ? error.message : 'Agent action unavailable' },
      { status: error instanceof AgentError ? error.status : 503 });
  }
}
