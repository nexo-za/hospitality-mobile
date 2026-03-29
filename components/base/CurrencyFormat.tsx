import React from "react";
import { NumericFormat } from "react-number-format";
import { Text } from "react-native";

interface CurrencyFormatProps {
  value: number | undefined;
  prefix?: string;
  suffix?: string;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
}

export function CurrencyFormat({
  value,
  prefix = "R",
  suffix = "",
  decimalScale = 2,
  fixedDecimalScale = true,
}: CurrencyFormatProps) {
  if (value === undefined || value === null) {
    return <Text>R0.00</Text>;
  }

  return (
    <NumericFormat
      value={value}
      displayType="text"
      thousandSeparator=" "
      decimalSeparator="."
      prefix={prefix}
      suffix={suffix}
      decimalScale={decimalScale}
      fixedDecimalScale={fixedDecimalScale}
      renderText={(formattedValue) => <Text>{formattedValue}</Text>}
    />
  );
}

CurrencyFormat.format = (value: number | undefined): string => {
  if (value === undefined || value === null) {
    return "R0.00";
  }
  return `R${value.toFixed(2)}`;
};
