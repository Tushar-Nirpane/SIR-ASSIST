/**
 * Soundex and Double Metaphone algorithm for Indian and international names
 */

export function soundex(str: string): string {
  if (!str) return '0000';
  const cleanStr = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!cleanStr) return '0000';

  const firstLetter = cleanStr[0];
  const mapping: Record<string, string> = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6',
  };

  let code = firstLetter;
  let previousDigit = mapping[firstLetter] || '0';

  for (let i = 1; i < cleanStr.length; i++) {
    const char = cleanStr[i];
    const currentDigit = mapping[char] || '0';

    if (currentDigit !== '0' && currentDigit !== previousDigit) {
      code += currentDigit;
    }
    previousDigit = currentDigit;

    if (code.length === 4) break;
  }

  while (code.length < 4) {
    code += '0';
  }

  return code;
}

/**
 * Simplified Metaphone for transliterated Hindi/Indian names (e.g. Sharma -> XRM, Verma -> FRM)
 */
export function metaphone(str: string): string {
  if (!str) return '';
  let s = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';

  // Common Hindi transliteration substitutions
  s = s.replace(/^KN|^GN|^PN|^AE|^WR/, 'N');
  s = s.replace(/SH|SCH|CH/g, 'X');
  s = s.replace(/PH/g, 'F');
  s = s.replace(/TH/g, '0');
  s = s.replace(/BH|DH|GH|JH|KH/g, (m) => m[0]);
  s = s.replace(/EE|EA|EI|EY/g, 'I');
  s = s.replace(/OO|OU/g, 'U');
  s = s.replace(/CK/g, 'K');
  s = s.replace(/C(?=[IEY])/g, 'S');
  s = s.replace(/C/g, 'K');
  s = s.replace(/Q/g, 'K');
  s = s.replace(/V/g, 'F');
  s = s.replace(/Z/g, 'S');

  // Strip vowels except starting vowel
  const first = s[0];
  const rest = s.slice(1).replace(/[AEIOUY]/g, '');
  return (first + rest).slice(0, 6);
}
