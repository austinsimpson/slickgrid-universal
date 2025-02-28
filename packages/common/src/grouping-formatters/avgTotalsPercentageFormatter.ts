import { Column, GroupTotalsFormatter, SlickGrid } from './../interfaces/index';
import { decimalFormatted, thousandSeparatorFormatted } from '../services/utilities';
import { getValueFromParamsOrFormatterOptions } from '../formatters/formatterUtilities';

export const avgTotalsPercentageFormatter: GroupTotalsFormatter = (totals: any, columnDef: Column, grid: SlickGrid) => {
  const field = columnDef.field ?? '';
  let val = totals.avg?.[field];
  const params = columnDef?.params;
  let prefix = params?.groupFormatterPrefix || '';
  const suffix = params?.groupFormatterSuffix || '';
  const minDecimal = getValueFromParamsOrFormatterOptions('minDecimal', columnDef, grid);
  const maxDecimal = getValueFromParamsOrFormatterOptions('maxDecimal', columnDef, grid);
  const decimalSeparator = getValueFromParamsOrFormatterOptions('decimalSeparator', columnDef, grid, '.');
  const thousandSeparator = getValueFromParamsOrFormatterOptions('thousandSeparator', columnDef, grid, '');
  const displayNegativeNumberWithParentheses = getValueFromParamsOrFormatterOptions('displayNegativeNumberWithParentheses', columnDef, grid, false);

  if (val !== null && !isNaN(+val)) {
    if (val < 0) {
      val = Math.abs(val);
      if (!displayNegativeNumberWithParentheses) {
        prefix += '-';
      } else {
        if (isNaN(minDecimal) && isNaN(maxDecimal)) {
          const outputVal = thousandSeparatorFormatted(Math.round(val), thousandSeparator);
          return `${prefix}(${outputVal}%)${suffix}`;
        }
        return `${prefix}(${decimalFormatted(val, minDecimal, maxDecimal, decimalSeparator, thousandSeparator)}%)${suffix}`;
      }
    }

    if (isNaN(minDecimal) && isNaN(maxDecimal)) {
      const outputVal = thousandSeparatorFormatted(Math.round(val), thousandSeparator);
      return `${prefix}${outputVal}%${suffix}`;
    }
    return `${prefix}${decimalFormatted(val, minDecimal, maxDecimal, decimalSeparator, thousandSeparator)}%${suffix}`;
  }
  return '';
};
