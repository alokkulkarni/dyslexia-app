/**
 * Rule-based syllabification for dyslexia reading support.
 * Inserts a middle dot (·) between syllables using three rules:
 *   VCV  — split before consonant-vowel: ti·ger, a·go
 *   VCCV — split between consonant pair: but·ter, mon·ster
 *   V+CC — split after vowel before double consonant: hap·py
 */
export function syllabify(word) {
  if (!word || word.length <= 3) return word;

  // Recursively handle phrases
  if (word.includes(' ')) {
    return word.split(' ').map(w => syllabify(w)).join(' ');
  }

  const isVowel = (ch) => ch && /[aeiouy]/i.test(ch);
  const isConsonant = (ch) => ch && /[bcdfghjklmnpqrstvwxz]/i.test(ch);

  const chars = [...word];
  let result = '';

  for (let i = 0; i < chars.length; i++) {
    result += chars[i];

    // Don't split if we're at or near the end
    if (i >= chars.length - 2) continue;

    const c0 = chars[i];
    const c1 = chars[i + 1];
    const c2 = chars[i + 2];
    const c3 = chars[i + 3]; // may be undefined

    if (!isVowel(c0)) continue;

    if (isConsonant(c1) && isVowel(c2)) {
      // V·CV — e.g. e·lephant, ti·ger, ba·nana
      result += '·';
    } else if (isConsonant(c1) && isConsonant(c2) && isVowel(c3)) {
      // VC·CV — e.g. co·mputer, rai·nbow
      result += '·';
    } else if (isConsonant(c1) && c1.toLowerCase() === c2?.toLowerCase()) {
      // V + double consonant — e.g. ha·ppy, ki·tten
      result += '·';
    }
  }

  return result;
}
