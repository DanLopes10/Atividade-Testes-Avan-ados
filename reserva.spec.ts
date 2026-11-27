import request from 'supertest';
import { app } from '../src/app';

const calcular = (corpo: unknown) =>
  request(app).post('/api/reservas/calcular').send(corpo as object);

const ERRO_DIAS = { erro: 'Quantidade de dias inválida' };
const ERRO_DIARIA = { erro: 'Valor da diária inválido' };

describe('POST /api/reservas/calcular - Testes de Caixa Preta', () => {
  describe('Caminho feliz', () => {
    it('deve calcular 2 dias a R$ 100 sem desconto (HTTP 200)', async () => {
      const res = await calcular({ dias: 2, valorDiaria: 100 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal: 200, desconto: 0, total: 200 });
    });

    it('deve calcular 5 dias a R$ 100 com 5% de desconto', async () => {
      const res = await calcular({ dias: 5, valorDiaria: 100 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal: 500, desconto: 25, total: 475 });
    });

    it('deve calcular 12 dias a R$ 100 com 10% de desconto', async () => {
      const res = await calcular({ dias: 12, valorDiaria: 100 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal: 1200, desconto: 120, total: 1080 });
    });

    it('deve aplicar o cupom UNIVERTIX10 após o desconto por dias', async () => {
      const res = await calcular({ dias: 5, valorDiaria: 100, cupom: 'UNIVERTIX10' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal: 500, desconto: 25, total: 425 });
    });
  });

  describe('Valores limites de dias', () => {
    it.each([
      [1, 0],
      [3, 0],
      [4, 0.05],
      [10, 0.05],
      [11, 0.1],
      [30, 0.1],
    ])('deve aplicar o percentual correto para %i dia(s)', async (dias, percentual) => {
      const res = await calcular({ dias, valorDiaria: 100 });
      const subtotal = dias * 100;
      const desconto = subtotal * percentual;
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal, desconto, total: subtotal - desconto });
    });

    it('deve rejeitar 31 dias', async () => {
      const res = await calcular({ dias: 31, valorDiaria: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });

    it('deve rejeitar 0 dias', async () => {
      const res = await calcular({ dias: 0, valorDiaria: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });
  });

  describe('Valores limites da diária', () => {
    it('deve rejeitar diária de R$ 49,99', async () => {
      const res = await calcular({ dias: 2, valorDiaria: 49.99 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIARIA);
    });

    it('deve aceitar diária de R$ 50,00', async () => {
      const res = await calcular({ dias: 2, valorDiaria: 50 });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ subtotal: 100, desconto: 0, total: 100 });
    });
  });

  describe('Entradas inválidas', () => {
    it.each([
      ['negativo', -5],
      ['decimal', 2.5],
      ['string', '5'],
      ['string vazia', ''],
      ['nulo', null],
      ['booleano', true],
      ['array', [1]],
      ['objeto', {}],
    ])('deve rejeitar dias %s', async (_nome, dias) => {
      const res = await calcular({ dias, valorDiaria: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });

    it('deve rejeitar dias ausente', async () => {
      const res = await calcular({ valorDiaria: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });

    it.each([
      ['zero', 0],
      ['negativa', -100],
      ['string numérica', '100'],
      ['string vazia', ''],
      ['texto', 'abc'],
      ['nula', null],
      ['booleana', true],
    ])('deve rejeitar diária %s', async (_nome, valorDiaria) => {
      const res = await calcular({ dias: 2, valorDiaria });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIARIA);
    });

    it('deve rejeitar diária ausente', async () => {
      const res = await calcular({ dias: 2 });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIARIA);
    });

    it('deve rejeitar corpo vazio priorizando erro de dias', async () => {
      const res = await calcular({});
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });

    it('deve rejeitar requisição sem corpo', async () => {
      const res = await request(app).post('/api/reservas/calcular');
      expect(res.status).toBe(400);
      expect(res.body).toEqual(ERRO_DIAS);
    });
  });
});

describe('Testes de Caixa Branca - Cobertura de Caminhos', () => {
  it('deve ignorar cupom inexistente', async () => {
    const res = await calcular({ dias: 5, valorDiaria: 100, cupom: 'INVALIDO' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subtotal: 500, desconto: 25, total: 475 });
  });

  it('deve ser sensível a maiúsculas e minúsculas no cupom', async () => {
    const res = await calcular({ dias: 2, valorDiaria: 100, cupom: 'univertix10' });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(200);
  });

  it('deve ignorar cupom com tipo inválido', async () => {
    const res = await calcular({ dias: 2, valorDiaria: 100, cupom: 123 });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(200);
  });

  it('deve funcionar sem o campo cupom', async () => {
    const res = await calcular({ dias: 1, valorDiaria: 50 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subtotal: 50, desconto: 0, total: 50 });
  });

  it('deve zerar o total quando o cupom excede o valor (sem total negativo)', async () => {
    const res = await calcular({ dias: 1, valorDiaria: 50, cupom: 'UNIVERTIX10' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subtotal: 50, desconto: 0, total: 0 });
  });

  it('deve aplicar cupom junto com 10% de desconto', async () => {
    const res = await calcular({ dias: 20, valorDiaria: 100, cupom: 'UNIVERTIX10' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subtotal: 2000, desconto: 200, total: 1750 });
  });

  it('deve arredondar valores monetários em duas casas decimais', async () => {
    const res = await calcular({ dias: 4, valorDiaria: 50.55 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ subtotal: 202.2, desconto: 10.11, total: 192.09 });
  });

  it('deve rejeitar diária infinita', async () => {
    const res = await request(app)
      .post('/api/reservas/calcular')
      .set('Content-Type', 'application/json')
      .send('{"dias": 2, "valorDiaria": 1e999}');
    expect(res.status).toBe(400);
    expect(res.body).toEqual(ERRO_DIARIA);
  });
});
