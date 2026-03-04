# Guia de Conexão: Zenith 3.0 Cloud ☁️

Para ligares a tua App ao mundo real, segue estes passos simples para configurar a Cloudflare:

### 1. Criar a Base de Dados (D1)
Podes fazer isto pela UI (como na imagem que enviaste) ou pelo terminal:
1. No site da Cloudflare, dá o nome **`zenith-db`** à base de dados.
2. Clica em **Create**.
3. Copia o **`database_id`** (um código longo tipo `abc-123...`).

### 2. Configurar o Código
Abre o ficheiro `api/wrangler.toml` e substitui o ID:
```toml
[[d1_databases]]
binding = "DB"
database_name = "zenith-db"
database_id = "COLA_AQUI_O_TEU_ID" 
```

### 3. Criar as Tabelas (Schema)
No teu terminal, corre este comando para criar a estrutura dos utilizadores e hábitos:
```bash
cd api
# Cria as tabelas na nuvem
npx wrangler d1 execute zenith-db --remote --file=./schema.sql
```

### 4. Definir uma Chave de Segurança (JWT)
O Zenith usa um segredo para garantir que ninguém consegue falsificar acessos. Define um segredo teu:
```bash
npx wrangler secret put JWT_SECRET
# Quando pedir, escreve uma frase secreta longa e aleatória
```

### 5. Deploy do Backend
```bash
npx wrangler deploy
```
No fim, a Cloudflare vai dar-te um URL (ex: `zenith-api.teunome.workers.dev`). **Copia esse URL.**

### 6. Ligar o iOS à Nuvem
Abre o ficheiro `store/useStore.ts` e altera a linha do `API_URL`:
```typescript
// No ficheiro store/useStore.ts
const API_URL = 'COLA_AQUI_O_URL_DO_WORKER'; 
```

---

### ⚠️ Resolução de Problemas (Troubleshooting)

**1. Erro de Caminho (OneDrive):**
Se vires o erro `Missing file or directory: ... OneDrive`, é porque o terminal está a tentar ler configurações fora da pasta do projeto. 
**Solução:** Garante que estás exatamente dentro da pasta `api` do projeto Zenith antes de correres os comandos.

**2. Subdomínio Cloudflare:**
A primeira vez que fazes `deploy`, a Cloudflare pergunta qual o subdomínio que queres (ex: `teu-nome.workers.dev`). Responde **Yes** (Y) no terminal e escolhe o teu nome.

---

### Verificação Final
1. Abre a App no Simulador.
2. Vai a **Settings** -> **Entrar**.
3. Cria uma conta nova.
4. Se o ícone da Nuvem ficar verde 🟢, estás oficialmente no Zenith 3.0! 🚀
