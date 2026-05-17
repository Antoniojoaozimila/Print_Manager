import { hashPassword, verifyPassword } from '../src/services/authService.js';

describe('authService', () => {
  test('hash e verificação de senha', async () => {
    const hash = await hashPassword('segredo123');
    expect(hash).toBeTruthy();
    await expect(verifyPassword('segredo123', hash)).resolves.toBe(true);
    await expect(verifyPassword('errado', hash)).resolves.toBe(false);
  });
});
