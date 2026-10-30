import {
  extractExternalParticipants,
  resolveClientLink,
} from './client-link.js';

describe('extractExternalParticipants', () => {
  it('returns empty when only internal participants', () => {
    const result = extractExternalParticipants([
      {
        email: 'anna@vinseo.example',
        displayName: 'Anna',
        internal: true,
      },
    ]);
    expect(result.externalParticipants).toEqual([]);
    expect(result.emailDomains).toEqual([]);
  });

  it('collects external emails and unique lowercase domains', () => {
    const result = extractExternalParticipants([
      {
        email: 'anna@vinseo.example',
        displayName: 'Anna',
        internal: true,
      },
      {
        email: 'jan.nowak@Client-X.Example',
        displayName: 'Jan',
        internal: false,
      },
      {
        email: 'other@client-x.example',
        displayName: 'Other',
        internal: false,
      },
      {
        email: null,
        displayName: 'No mail',
        internal: false,
      },
    ]);
    expect(result.externalParticipants).toEqual([
      { email: 'jan.nowak@Client-X.Example', displayName: 'Jan' },
      { email: 'other@client-x.example', displayName: 'Other' },
    ]);
    expect(result.emailDomains).toEqual(['client-x.example']);
  });
});

describe('resolveClientLink', () => {
  it('returns internal when no external participants', async () => {
    const find = jest.fn();
    const result = await resolveClientLink(
      [{ email: 'a@vinseo.example', displayName: 'A', internal: true }],
      find,
    );
    expect(result).toEqual({
      status: 'internal',
      externalParticipants: null,
      clientId: null,
    });
    expect(find).not.toHaveBeenCalled();
  });

  it('returns unmatched when no Client for domain', async () => {
    const find = jest.fn().mockResolvedValue(null);
    const result = await resolveClientLink(
      [
        {
          email: 'jan@client-x.example',
          displayName: 'Jan',
          internal: false,
        },
      ],
      find,
    );
    expect(result.status).toBe('unmatched');
    if (result.status === 'unmatched') {
      expect(result.clientId).toBeNull();
      expect(result.externalParticipants).toHaveLength(1);
    }
    expect(find).toHaveBeenCalledWith('client-x.example');
  });

  it('returns matched on first domain hit', async () => {
    const find = jest.fn().mockResolvedValue({ id: 'client-1' });
    const result = await resolveClientLink(
      [
        {
          email: 'jan@client-x.example',
          displayName: 'Jan',
          internal: false,
        },
      ],
      find,
    );
    expect(result).toEqual({
      status: 'matched',
      clientId: 'client-1',
      externalParticipants: [
        { email: 'jan@client-x.example', displayName: 'Jan' },
      ],
    });
  });
});
