const cheerio = require('cheerio');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));

function cleanHtml(value) {
  const $ = cheerio.load(String(value || ''), null, false);
  $('script,iframe,object,embed,form,input,button,textarea,select,link,meta').remove();
  $('*').each((_, element) => {
    for (const attribute of [...(element.attribs ? Object.keys(element.attribs) : [])]) {
      const current = String($(element).attr(attribute) || '');
      if (/^on/i.test(attribute) || (/^(href|src|background)$/i.test(attribute) && /^\s*javascript:/i.test(current))) {
        $(element).removeAttr(attribute);
      }
    }
  });
  return $.html();
}

function renderBlock(block) {
  const align = ['left', 'center', 'right'].includes(block.align) ? block.align : 'left';
  switch (block.type) {
    case 'heading':
      return `<tr><td style="padding:18px 32px 8px;text-align:${align};"><h1 style="margin:0;font:700 28px/1.25 Arial,sans-serif;color:#111827;">${esc(block.content)}</h1></td></tr>`;
    case 'text':
      return `<tr><td style="padding:10px 32px;text-align:${align};font:15px/1.65 Arial,sans-serif;color:#374151;">${cleanHtml(block.content)}</td></tr>`;
    case 'image': {
      const image = `<img src="${esc(block.url)}" alt="${esc(block.alt)}" style="display:block;max-width:100%;height:auto;margin:${align === 'center' ? 'auto' : align === 'right' ? '0 0 0 auto' : '0'};border:0;border-radius:8px;">`;
      return `<tr><td style="padding:14px 32px;text-align:${align};">${block.link ? `<a href="${esc(block.link)}" target="_blank">${image}</a>` : image}</td></tr>`;
    }
    case 'button':
      return `<tr><td style="padding:16px 32px;text-align:${align};"><a href="${esc(block.url)}" target="_blank" style="display:inline-block;padding:12px 24px;border-radius:6px;background:${esc(block.background || '#ea580c')};color:#fff;font:700 14px Arial,sans-serif;text-decoration:none;">${esc(block.label || 'Learn more')}</a></td></tr>`;
    case 'divider':
      return '<tr><td style="padding:14px 32px;"><hr style="border:0;border-top:1px solid #e5e7eb;margin:0;"></td></tr>';
    case 'spacer':
      return `<tr><td height="${Math.min(100, Math.max(8, Number(block.height) || 24))}" style="font-size:0;line-height:0;">&nbsp;</td></tr>`;
    case 'html':
      return `<tr><td style="padding:10px 32px;">${cleanHtml(block.content)}</td></tr>`;
    default:
      return '';
  }
}

function renderStudioHtml(campaign) {
  const custom = String(campaign.html_content || '').trim();
  if (custom) return cleanHtml(custom);
  const rows = (campaign.content_blocks || []).map(renderBlock).join('');
  const hiddenPreheader = campaign.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(campaign.preheader)}</div>`
    : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(campaign.subject || campaign.title)}</title></head><body style="margin:0;padding:0;background:#f3f4f6;">${hiddenPreheader}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:28px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#fff;border-collapse:separate;border-spacing:0;border-radius:12px;overflow:hidden;">${rows}</table></td></tr></table></body></html>`;
}

module.exports = { renderStudioHtml, cleanHtml };
