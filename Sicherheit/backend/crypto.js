import argon2 from 'argon2';

// Argon2id configuration based on user specification
const HASH_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MB
  timeCost: 3, // 3 iterations
  parallelism: 4,
  hashLength: 64, // 64 bytes output
  saltLength: 32, // 32 bytes salt
};

/**
 * Hashes a password using Argon2id.
 * @param {string} password The plaintext password to hash.
 * @returns {Promise<string>} The resulting hash.
 */
export async function hashPassword(password) {
  try {
    return await argon2.hash(password, HASH_OPTIONS);
  } catch (err) {
    console.error("Password hashing failed:", err);
    throw new Error("Could not hash password.");
  }
}

/**
 * Verifies a password against a hash.
 * @param {string} hash The hash to verify against.
 * @param {string} password The plaintext password to check.
 * @returns {Promise<boolean>} True if the password matches the hash, false otherwise.
 */
export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch (err) {
    console.error("Password verification failed:", err);
    // In case of error (e.g., malformed hash), always return false for security.
    return false;
  }
}
