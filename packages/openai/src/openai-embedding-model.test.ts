import { EmbeddingModelV2Embedding } from '@ai-sdk/provider';
import { createTestServer } from '@ai-sdk/provider-utils/test';
import { createOpenAI } from './openai-provider';

const dummyEmbeddings = [
  [0.1, 0.2, 0.3, 0.4, 0.5],
  [0.6, 0.7, 0.8, 0.9, 1.0],
];
const testValues = ['sunny day at the beach', 'rainy day in the city'];

const provider = createOpenAI({ apiKey: 'test-api-key' });
const model = provider.embedding('text-embedding-3-large');

const server = createTestServer({
  'https://api.openai.com/v1/embeddings': {},
});

describe('doEmbed', () => {
  function prepareJsonResponse({
    embeddings = dummyEmbeddings,
    usage = { prompt_tokens: 8, total_tokens: 8 },
    headers,
  }: {
    embeddings?: EmbeddingModelV2Embedding[];
    usage?: { prompt_tokens: number; total_tokens: number };
    headers?: Record<string, string>;
  } = {}) {
    server.urls['https://api.openai.com/v1/embeddings'].response = {
      type: 'json-value',
      headers,
      body: {
        object: 'list',
        data: embeddings.map((embedding, i) => ({
          object: 'embedding',
          index: i,
          embedding,
        })),
        model: 'text-embedding-3-large',
        usage,
      },
    };
  }

  it('should extract embedding', async () => {
    prepareJsonResponse();

    const { embeddings } = await model.doEmbed({ values: testValues });

    expect(embeddings).toStrictEqual(dummyEmbeddings);
  });

  it('should expose the raw response', async () => {
    prepareJsonResponse({
      headers: {
        'test-header': 'test-value',
      },
    });

    const { response } = await model.doEmbed({ values: testValues });

    expect(response?.headers).toStrictEqual({
      // default headers:
      'content-length': '236',
      'content-type': 'application/json',

      // custom header
      'test-header': 'test-value',
    });
    expect(response).toMatchSnapshot();
  });

  it('should extract usage', async () => {
    prepareJsonResponse({
      usage: { prompt_tokens: 20, total_tokens: 20 },
    });

    const { usage } = await model.doEmbed({ values: testValues });

    expect(usage).toStrictEqual({ tokens: 20 });
  });

  it('should pass the model and the values', async () => {
    prepareJsonResponse();

    await model.doEmbed({ values: testValues });

    expect(await server.calls[0].requestBodyJson).toStrictEqual({
      model: 'text-embedding-3-large',
      input: testValues,
      encoding_format: 'float',
    });
  });

  it('should pass the dimensions setting', async () => {
    prepareJsonResponse();

    await provider.embedding('text-embedding-3-large').doEmbed({
      values: testValues,
      providerOptions: { openai: { dimensions: 64 } },
    });

    expect(await server.calls[0].requestBodyJson).toStrictEqual({
      model: 'text-embedding-3-large',
      input: testValues,
      encoding_format: 'float',
      dimensions: 64,
    });
  });

  it('should pass headers', async () => {
    prepareJsonResponse();

    const provider = createOpenAI({
      apiKey: 'test-api-key',
      organization: 'test-organization',
      project: 'test-project',
      headers: {
        'Custom-Provider-Header': 'provider-header-value',
      },
    });

    await provider.embedding('text-embedding-3-large').doEmbed({
      values: testValues,
      headers: {
        'Custom-Request-Header': 'request-header-value',
      },
    });

    expect(server.calls[0].requestHeaders).toStrictEqual({
      authorization: 'Bearer test-api-key',
      'content-type': 'application/json',
      'custom-provider-header': 'provider-header-value',
      'custom-request-header': 'request-header-value',
      'openai-organization': 'test-organization',
      'openai-project': 'test-project',
    });
  });
});
