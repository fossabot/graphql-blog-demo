import * as Koa from 'koa';
import * as KoaRouter from 'koa-router';
import * as graphqlHTTP from 'koa-graphql';
import * as koaConvert from 'koa-convert';
import * as koaStatic from 'koa-static';
import * as path from 'path';
import graphiql from 'koa-custom-graphiql';

const app = new Koa();
const router = new KoaRouter();

router.get('/graphql', graphiql({
  css: '/graphiql.css',
  js: '/graphiql.js',
}));

router.post('/graphql', koaConvert(graphqlHTTP({
  schema: schemaBasic,

  formatError: (e: Error) => {
    console.error(e);
    return e;
  },
})));

router.redirect('/', '/graphql');

app.use(router.routes());
app.use(router.allowedMethods());

// Serve the custom build of GraphiQL that shows SQL generation.
app.use(koaStatic(path.join(__dirname, '../node_modules/graphsiql')));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Listening on port '${port}'`);
});
