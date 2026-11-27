import express, { Request, Response } from 'express';

export const app = express();
app.use(express.json());

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

const diasValidos = (dias: unknown): dias is number =>
  typeof dias === 'number' && Number.isInteger(dias) && dias >= 1 && dias <= 30;

const valorDiariaValido = (valor: unknown): valor is number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 50;

const percentualPorDias = (dias: number): number => {
  if (dias <= 3) {
    return 0;
  }
  if (dias <= 10) {
    return 0.05;
  }
  return 0.1;
};

app.post('/api/reservas/calcular', (req: Request, res: Response) => {
  const { dias, valorDiaria, cupom } = req.body ?? {};

  if (!diasValidos(dias)) {
    return res.status(400).json({ erro: 'Quantidade de dias inválida' });
  }

  if (!valorDiariaValido(valorDiaria)) {
    return res.status(400).json({ erro: 'Valor da diária inválido' });
  }

  const subtotal = arredondar(dias * valorDiaria);
  const desconto = arredondar(subtotal * percentualPorDias(dias));
  const descontoCupom = cupom === 'UNIVERTIX10' ? 50 : 0;
  const total = arredondar(Math.max(0, subtotal - desconto - descontoCupom));

  return res.status(200).json({ subtotal, desconto, total });
});
