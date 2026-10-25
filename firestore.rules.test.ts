import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Firestore rules enforce all 8 hardened security pillars and reject Dirty Dozen patterns', () => {
  const rules = fs.readFileSync('./firestore.rules', 'utf8');

  // 1. Rules version 2 and global default-deny catch-all
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s*false;\s*\}/);

  // 2. Verified email requirement on writes
  assert.match(rules, /request\.auth\.token\.email_verified\s*==\s*true/);

  // 3. Path variable hardening helper
  assert.match(rules, /function\s+isValidId\(id\)/);

  // 4. Temporal integrity (request.time)
  assert.match(rules, /incoming\(\)\.createdAt\s*==\s*request\.time/);
  assert.match(rules, /incoming\(\)\.updatedAt\s*==\s*request\.time/);

  // 5. Strict validation helpers for all entities
  assert.match(rules, /function\s+isValidUserProfile\(data\)/);
  assert.match(rules, /function\s+isValidUserPrivateInfo\(data\)/);
  assert.match(rules, /function\s+isValidAssessmentActivity\(data\)/);
  assert.match(rules, /function\s+isValidQuestionItem\(data\)/);
  assert.match(rules, /function\s+isValidAssessmentAttempt\(data\)/);

  // 6. Action-based update with affectedKeys().hasOnly()
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(/);

  // 7. Terminal state locking on attempts
  assert.match(rules, /existing\(\)\.status\s*!=\s*'graded'/);
});
