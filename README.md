# 📦 OAsys ERP — Landing Page com Envio de Contato por E-mail

Esta é a landing page oficial do **Oasys**, um sistema de gestão inteligente com módulos independentes e IA integrada (OAsys Neuron). O site apresenta os planos, módulos e permite que os visitantes entrem em contato por meio de um formulário que envia e-mails via PHPMailer.

---

## 🚀 Tecnologias Utilizadas

- **HTML5 + CSS3**: Estrutura e estilo da página
- **JavaScript Vanilla**: Captura e envio assíncrono do formulário
- **PHP (envio de e-mail)**: Backend do formulário
- **PHPMailer**: Envio de e-mails via SMTP
- **Dotenv**: Gerenciamento de variáveis de ambiente (.env)

---

## 📁 Estrutura do Projeto

```
/
├── index.html # Página principal (landing page)
├── enviar.php # Backend PHP que processa e envia o e-mail
├── .env # Variáveis de ambiente sensíveis (não versionar!)
├── styles/
│ └── index.css # Estilos da página
│ └── globals.css # Definições gerais
│ └── utility.css # Estilos dos componentes
├── assets/
│ └── logo.png # Logo do Oasys
│ └── branding.png # Banner do hero
└── composer.json # Dependências PHP
```

---

## ⚙️ Como Rodar Localmente

### 1. Clone o repositório

```bash
git clone https://github.com/Iago1221/OAsys-Lading-page.git
cd OAsys-Lading-page
```

### 2. Instale as dependências

```bash
composer install
```

### 3. Crie um arquivo .env

Crie um arquivo .env na raiz do projeto com o seguinte conteúdo (ajuste com suas credenciais SMTP):

```
EMAIL_USERNAME=seu_email@gmail.com
EMAIL_PASSWORD=sua_senha_ou_app_password
EMAIL_ADDRESS=destinatario@seudominio.com
```

⚠️ Dica: use uma senha de aplicativo se estiver usando Gmail (configurar em https://myaccount.google.com/apppasswords)

### 4. Suba um servidor PHP local

```bash
php -S localhost:8080
```

Acesse: http://localhost:8080

## 📬 Envio de Formulário

O formulário envia os dados usando fetch e método POST para enviar.php, que:

- Valida o e-mail
- Usa o PHPMailer com credenciais do .env
- Envia o conteúdo para o endereço configurado

## 🛡️ Segurança

- O .env não deve ser versionado
- Os dados do formulário são sanitizados
- O servidor SMTP deve exigir autenticação segura

## 📄 Licença
- Este projeto é de uso interno e pode ser adaptado para fins comerciais. Direitos reservados a Oasys Tecnologia © 2025.