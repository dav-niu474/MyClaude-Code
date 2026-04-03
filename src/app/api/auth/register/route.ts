import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'crypto';
import { ensureSchema } from '@/lib/db-setup';

// Simple password hashing using SHA-256 (for MVP, use bcrypt in production)
function hashPassword(password: string): string {
  return hash('sha256', password).toString('hex');
}

export async function POST(request: Request) {
  try {
    // Auto-initialize database schema if needed
    await ensureSchema();

    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      );
    }

    // Create user
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        passwordHash: hashPassword(password),
      }
    });

    // Create default settings
    await db.userSettings.create({
      data: { userId: user.id }
    });

    // Create a JWT-like token (simple for MVP)
    const token = Buffer.from(JSON.stringify({
      userId: user.id,
      email: user.email,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
    })).toString('base64url');

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
