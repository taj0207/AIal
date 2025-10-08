export class EchoAdapter {
  constructor(name) {
    this.name = name;
  }

  async chatSync(req) {
    return {
      id: `${this.name}-echo`,
      model: req.model,
      provider: this.name,
      output: [
        {
          role: 'assistant',
          content: `[${this.name}] echo: ${req.input[req.input.length - 1]?.content ?? ''}`
        }
      ]
    };
  }
}
