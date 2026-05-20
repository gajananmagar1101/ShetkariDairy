export const getDisplayLocale = (language?: string) =>
  language === 'mr' ? 'mr-IN-u-nu-latn' : 'en-IN-u-nu-latn'

export const toEnglishDigits = (value: string) =>
  value
    .replace(/[०-९]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
