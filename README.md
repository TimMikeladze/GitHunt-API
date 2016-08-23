# GitHunt

The Apollo Server backend shared by all Apollo client example apps.

[![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)
[![Build Status](https://travis-ci.org/apollostack/GitHunt-server.svg?branch=master)](https://travis-ci.org/apollostack/GitHunt-server)

Demonstrates:

1. GraphQL schema, resolvers, models, and connectors to read from two different data sources, GitHub REST API and SQL
2. Web server with authentication and basic authorization using Express, Passport, and Apollo Server

Please submit a pull request if you see anything that can be improved!

## Running the server

### 1. Install Node/npm

Make sure you have Node.js 4 or newer installed.

### 2. Clone and install dependencies

```
git clone https://github.com/apollostack/GitHunt.git
cd GitHunt
npm install
```

### 3. Run Migrations

Set up the SQLite database and run migrations/seed data with the following commands:

```
npm run migrate
npm run seed
```

### 4. Get GitHub API keys

- Go to [OAuth applications > Developer applications](https://github.com/settings/developers) in GitHub settings
- Click 'Register a new application' button
- Register your application like below
- Click 'Register application' button

![Github OAuth](screenshots/github-oath-setup.png)

On the following page, grab:

- Client ID
- Client Secret

![OAuth Key](screenshots/github-oauth-keys.png)

### 5. Add Environment Variables
Set your Client ID and Client Secret Environment variables:

```
export GITHUB_CLIENT_ID="your Client ID"
export GITHUB_CLIENT_SECRET="your Client Secret"
```

Or you can use `dotenv`.

`cp .env.default .env` and edit with your Github keys.

### 6. Run the app

```
npm start
```

- Open graphiql at http://localhost:3010/graphiql
