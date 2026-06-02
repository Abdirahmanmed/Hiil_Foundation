export function chartHasData(data) {
  return (data || []).some((item) => Number(item?.value ?? item?.count ?? item?.amount ?? 0) > 0);
}

export function statusRowsToChart(rows, labeler = (value) => value) {
  return (rows || []).map((row) => ({
    name: labeler(row?.status || "-"),
    value: Number(row?.count || 0),
    amount: Number(row?.amount || 0),
  }));
}
