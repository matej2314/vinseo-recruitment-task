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

  it('POST /demo/run-meeting enqueues with session (UUID run ≠ fixture)', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'demo@example.com', password: 'Password1!abcd' });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'demo@example.com' },
    });

    const res = await agent.post('/demo/run-meeting').send({}).expect(201);

    expect(res.body.meetingId).toBeTruthy();
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('pending');

    const m = await prisma.meeting.findUniqueOrThrow({
      where: { id: res.body.meetingId },
    });
    expect(m.organizerId).toBe(user.id);
    // UUID runu - nie stały fixture key
    expect(m.externalMeetingId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(m.externalMeetingId).not.toBe('demo-client-budget-pl');
  });

  it('multi-tester DEMO: two users × Test → two meetings; ACL isolation', async () => {
    const agentA = request.agent(app.getHttpServer());
    await agentA
      .post('/auth/register')
      .send({ email: 'tester-a@example.com', password: 'Password1!abcd' });
    const userA = await prisma.user.findUniqueOrThrow({
      where: { email: 'tester-a@example.com' },
    });

    const agentB = request.agent(app.getHttpServer());
    await agentB
      .post('/auth/register')
      .send({ email: 'tester-b@example.com', password: 'Password1!abcd' });
    const userB = await prisma.user.findUniqueOrThrow({
      where: { email: 'tester-b@example.com' },
    });

    const resA = await agentA.post('/demo/run-meeting').send({}).expect(201);
    const resB = await agentB.post('/demo/run-meeting').send({}).expect(201);

    expect(resA.body.meetingId).not.toBe(resB.body.meetingId);

    const meetingA = await prisma.meeting.findUniqueOrThrow({
      where: { id: resA.body.meetingId },
    });
    const meetingB = await prisma.meeting.findUniqueOrThrow({
      where: { id: resB.body.meetingId },
    });

    expect(meetingA.organizerId).toBe(userA.id);
    expect(meetingB.organizerId).toBe(userB.id);
    expect(meetingA.externalMeetingId).not.toBe(meetingB.externalMeetingId);

    await agentA.get(`/meetings/${meetingA.id}`).expect(200);
    await agentA.get(`/meetings/${meetingB.id}`).expect(404);
    await agentB.get(`/meetings/${meetingB.id}`).expect(200);
    await agentB.get(`/meetings/${meetingA.id}`).expect(404);
  });

  it('same user two Tests → two Meeting rows', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post('/auth/register')
      .send({ email: 'repeat@example.com', password: 'Password1!abcd' });

    const first = await agent.post('/demo/run-meeting').send({}).expect(201);
    const second = await agent.post('/demo/run-meeting').send({}).expect(201);

    expect(first.body.meetingId).not.toBe(second.body.meetingId);

    const rows = await prisma.meeting.findMany({
      where: {
        id: { in: [first.body.meetingId, second.body.meetingId] },
      },
    });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.externalMeetingId)).size).toBe(2);
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
