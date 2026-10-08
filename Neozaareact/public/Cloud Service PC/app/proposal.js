(() => {
  const button = document.getElementById('downloadProposal');

  button.addEventListener('click', () => {
    const details = window.proposalData;
    if (!details?.packageId) {
      alert('Complete and save the Managed IT & Cybersecurity Support section before downloading the proposal.');
      return;
    }
    const parameters = new URLSearchParams({
      packageId: details.packageId,
      model: details.model || '',
      validity: String(details.validityMonths),
      extension: String(Boolean(details.extension)),
      addons: (details.addonIds || []).join(','),
      expectedDiscount: String(Math.min(100, Math.max(0, Number(document.getElementById('expectedDiscount')?.value) || 0))),
      catalogueTotalInr: String(Math.round(totals().grand * (currency === 'USD' ? INR_PER_USD : 1))),
    });
    const link = document.createElement('a');
    link.href = `/proposal.docx?${parameters}`;
    link.download = 'NeoZaar_Managed_IT_Cybersecurity_Proposal.docx';
    document.body.append(link);
    link.click();
    link.remove();
  });
})();
