import { useState } from "react";
import { preprocess } from "../engine/preprocessing";
import {
  Control,
  Formula,
  LabLayout,
  Matrix,
  Plot,
  Select,
  fmt,
} from "../components/Primitives";
export default function Preprocessing() {
  const [values, setValues] = useState([[2, 4, 6, 8, 10, 12]]),
    [missing, setMissing] = useState(-1),
    [method, setMethod] = useState("Z-score"),
    [bins, setBins] = useState(4);
  const f = preprocess(
    values[0].map((v, i) => (i === missing ? null : v)),
    method,
    bins,
  );
  return (
    <LabLayout
      controls={
        <>
          <Matrix
            name="Raw feature values"
            values={values}
            onChange={setValues}
          />
          <Control
            label="Missing value index (−1: none)"
            value={missing}
            min={-1}
            max={5}
            step={1}
            onChange={setMissing}
          />
          <Select
            label="Transformation"
            value={method}
            options={[
              "Mean imputation",
              "Min-max",
              "Z-score",
              "Decimal scaling",
              "Discretize",
            ]}
            onChange={setMethod}
          />
          <Control
            label="Bins"
            value={bins}
            min={2}
            max={8}
            step={1}
            onChange={setBins}
          />
          <p>
            A missing value is first replaced with the observed mean. Scaling
            parameters must be learned on training data and reused for
            validation/test data to avoid leakage. Real data cleaning also
            requires domain decisions about errors, outliers and units.
          </p>
          <p>
            Integration combines compatible sources using keys and units.
            Aggregation summarizes records. Feature selection retains useful
            columns; PCA instead constructs new combinations of columns.
          </p>
        </>
      }
    >
      <Plot
        title="Transformed values"
        points={f.output.map((y, x) => ({
          x,
          y,
          label: x === missing ? 1 : 0,
        }))}
        xRange={[0, 5]}
        yRange={[Math.min(-1, ...f.output), Math.max(1, ...f.output)]}
      />
      <Matrix name="Imputed values" values={[f.imputed]} />
      <Matrix name="Transformed values" values={[f.output]} />
      <Formula
        symbol={
          method === "Z-score"
            ? "z = (x − mean) / standard deviation"
            : method === "Min-max"
              ? "x′ = (x − min) / (max − min)"
              : method === "Decimal scaling"
                ? "x′ = x / 10ᵏ"
                : method === "Discretize"
                  ? "bin = min(B−1, floor((x−min)/(max−min) × B))"
                  : "missing x = observed mean"
        }
        result={`Mean ${fmt(f.mean)}; standard deviation ${fmt(f.sd)}; min ${fmt(f.min)}; max ${fmt(f.max)}`}
      />
    </LabLayout>
  );
}
