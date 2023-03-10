/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer'
|
*/

import Route from '@ioc:Adonis/Core/Route'

Route.get('/', async () => {
  return { hello: 'world' }
})

Route.post('users', 'AuthController.register')
Route.post('users/login', 'AuthController.login')
Route.post('users/logout', 'AuthController.logout').middleware(['auth'])
Route.get('user', 'AuthController.me').middleware(['auth'])
Route.get('users/best-score', 'AuthController.bestScore').middleware(['auth'])
Route.put('users', 'AuthController.update').middleware(['auth'])
Route.delete('user', 'AuthController.deleteUser').middleware(['auth'])

Route.get('game/start', 'GamesController.startGame').middleware(['auth'])
Route.get('game/question/:gameId', 'GamesController.generateQuestion').middleware(['auth'])
Route.get('game/check-answer/:id/:cca3', 'GamesController.checkAnswer').middleware(['auth'])
