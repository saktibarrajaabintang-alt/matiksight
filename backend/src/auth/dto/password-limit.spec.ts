import { validate } from 'class-validator';
import { LoginDto } from './login.dto';
import { RegisterDto } from './register.dto';

describe('UTF-8 password byte limit', () => {
  it('accepts passwords at or below bcrypt’s 72-byte input boundary', async () => {
    const register = Object.assign(new RegisterDto(), {
      username: 'analyst01',
      email: 'analyst@example.com',
      password: '😀'.repeat(18),
    });
    expect(await validate(register)).toHaveLength(0);
  });

  it('rejects multibyte passwords exceeding 72 UTF-8 bytes for register and login', async () => {
    const password = '😀'.repeat(19);
    const register = Object.assign(new RegisterDto(), {
      username: 'analyst01', email: 'analyst@example.com', password,
    });
    const login = Object.assign(new LoginDto(), { identifier: 'analyst01', password });
    expect((await validate(register)).map((error) => error.property)).toContain('password');
    expect((await validate(login)).map((error) => error.property)).toContain('password');
  });
});
