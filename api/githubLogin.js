import session from 'express-session';
import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github';
import knex from './sql/connector';

import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
} from './githubKeys';

const KnexSessionStore = require('connect-session-knex')(session);

const store = new KnexSessionStore({
  knex,
});

export function setUpGitHubLogin(app) {
  if (!GITHUB_CLIENT_ID) {
    console.warn('GitHub client ID not passed; login won\'t work.'); // eslint-disable-line no-console
    return;
  }

  const gitHubStrategyOptions = {
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: process.env.NODE_ENV !== 'production' ?
      'http://localhost:3000/login/github/callback' :
      'http://www.githunt.com/login/github/callback',
  };

  passport.use(new GitHubStrategy(gitHubStrategyOptions,
    (accessToken, refreshToken, profile, cb) => {
      cb(null, profile);
    }));

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((obj, cb) => cb(null, obj));

  app.use(session({
    secret: 'your secret',
    resave: true,
    saveUninitialized: true,
    store,
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/login/github',
    passport.authenticate('github'));

  app.get('/login/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req, res) => res.redirect('/'));

  app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
  });
}
