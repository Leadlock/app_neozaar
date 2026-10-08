exports.toCSV = (rows) => {
    if (!rows.length) return "";

    const headers = Object.keys(rows[0]).join(",");
    const values = rows.map(r =>
        Object.values(r)
            .map(v => `"${String(v ?? "").replace(/"/g, '""')}"`)
            .join(",")
    );

    return [headers, ...values].join("\n");
};
