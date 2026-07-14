import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(
        'Пользователь с таким email уже зарегистрирован',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name.trim(),
        skillProfile: { create: {} },
      },
    });
    // Привязываем стартовую библиотеку фраз к новому пользователю
    const seedPhrases = await this.prisma.phrase.findMany({
      where: { source: 'SEED' },
      select: { id: true },
    });
    if (seedPhrases.length > 0) {
      await this.prisma.userPhrase.createMany({
        data: seedPhrases.map((p) => ({
          userId: user.id,
          phraseId: p.id,
          nextReviewAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }
    return this.issueToken(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Неверный email или пароль');
    }
    return this.issueToken(user.id, user.email);
  }

  private async issueToken(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-secret'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '30d',
        ) as any,
      },
    );
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        currentLevel: true,
        onboardingCompleted: true,
      },
    });
    return { accessToken, user };
  }
}
