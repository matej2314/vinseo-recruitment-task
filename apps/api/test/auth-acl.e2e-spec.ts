import { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { createApiValidationPipe } from '../src/http/create-api-validation-pipe.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auth + ACL + demo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.DATABASE_URL =
      process.env.DATABASE_URL_TEST ??
      'postgresql://vinseo:vinseo@localhost:5432/vinseo_test?schema=public';
    process.env.JWT_SECRET ??= 'test-jwt-secret-min-32-characters!!';
    process.env.COOKIE_SECURE ??= 'false';
    process.env.API_PORT ??= '3001';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(createApiValidationPipe());
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.auditLog.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.meetingParticipant.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register sets cookies; me works', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'a@example.com', password: 'Password1!abcd' })
      .expect(201)
      .expect((res) => {
        expect(res.body.user.email).toBe('a@example.com');
        const setCookie = res.headers['set-cookie'];
        expect(JSON.stringify(setCookie)).toContain('ma_access');
        expect(JSON.stringify(setCookie)).toContain('ma_refresh');
      });

    await agent.get('/auth/me').expect(200);
  });

  it('GET /meetings/:id without ACL → 404', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'owner@example.com', password: 'Password1!abcd' });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'owner@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'ext-1',
        organizerId: owner.id,
        processingStatus: 'completed',
      },
    });

    const stranger = request.agent(app.getHttpServer());
    await stranger
      .post('/auth/register')
      .send({ email: 'other@example.com', password: 'Password1!abcd' });

    await stranger.get(`/meetings/${meeting.id}`).expect(404);

    const denied = await prisma.auditLog.findFirst({
      where: { eventType: 'meeting.access.denied' },
    });
    expect(denied).toBeTruthy();
  });

  it('POST /demo/run-meeting enqueues with session', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'demo@example.com', password: 'Password1!abcd' });

    const res = await agent
      .post('/demo/run-meeting')
      .send({ fixtureKey: 'demo-client-budget-pl' })
      .expect(201);

    expect(res.body.meetingId).toBeTruthy();
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('pending');

    const m = await prisma.meeting.findUniqueOrThrow({
      where: { id: res.body.meetingId },
    });
    expect(m.organizerId).toBeTruthy();
  });

  it('SSE without ACL → 404', async () => {
    const ownerAgent = request.agent(app.getHttpServer());
    await ownerAgent
      .post('/auth/register')
      .send({ email: 'sse-owner@example.com', password: 'Password1!abcd' });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: 'sse-owner@example.com' },
    });
    const meeting = await prisma.meeting.create({
      data: {
        externalMeetingId: 'sse-ext',
        organizerId: owner.id,
        processingStatus: 'pending',
      },
    });

    const stranger = request.agent(app.getHttpServer());
    await stranger
      .post('/auth/register')
      .send({ email: 'sse-other@example.com', password: 'Password1!abcd' });

    await stranger.get(`/meetings/${meeting.id}/events`).expect(404);
  });
});
