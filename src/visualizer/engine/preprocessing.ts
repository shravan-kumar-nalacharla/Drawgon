import { sum } from "./math";
export function preprocess(
  values: (number | null)[],
  method: string,
  bins = 4,
) {
  const valid = values.filter(
    (v): v is number => v !== null && Number.isFinite(v),
  );
  if (!valid.length) throw new Error("Enter at least one finite value.");
  const mean = sum(valid) / valid.length,
    imputed = values.map((v) => (v === null ? mean : v)),
    min = Math.min(...valid),
    max = Math.max(...valid),
    sd = Math.sqrt(sum(valid.map((v) => (v - mean) ** 2)) / valid.length),
    decimal =
      10 ** Math.ceil(Math.log10(Math.max(1, ...valid.map(Math.abs)) + 1));
  return {
    mean,
    sd,
    min,
    max,
    imputed,
    output: imputed.map((v) =>
      method === "Min-max"
        ? max === min
          ? 0
          : (v - min) / (max - min)
        : method === "Z-score"
          ? sd
            ? (v - mean) / sd
            : 0
          : method === "Decimal scaling"
            ? v / decimal
            : method === "Discretize"
              ? Math.min(
                  bins - 1,
                  Math.max(
                    0,
                    Math.floor(((v - min) / Math.max(1e-12, max - min)) * bins),
                  ),
                )
              : v,
    ),
    decimal,
  };
}
export function scalarLoss(kind: string, p: number, y: number) {
  const error = p - y,
    pt = y ? p : 1 - p;
  switch (kind) {
    case "MSE":
      return error ** 2;
    case "MAE":
      return Math.abs(error);
    case "Huber":
      return Math.abs(error) <= 0.5
        ? 0.5 * error ** 2
        : 0.5 * (Math.abs(error) - 0.25);
    case "Log-cosh":
      return (
        Math.abs(error) +
        Math.log1p(Math.exp(-2 * Math.abs(error))) -
        Math.log(2)
      );
    case "Hinge":
      return Math.max(0, 1 - (y ? 1 : -1) * p);
    case "Focal":
      return -((1 - pt) ** 2) * Math.log(Math.max(1e-9, pt));
    default:
      return -(
        y * Math.log(Math.max(1e-9, p)) +
        (1 - y) * Math.log(Math.max(1e-9, 1 - p))
      );
  }
}
