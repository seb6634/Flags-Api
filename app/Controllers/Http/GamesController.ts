import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import axios from 'axios'
import { v4 as uuid } from 'uuid'
const NodeCache = require('node-cache')

const COUNTRIES_API_URL = 'https://restcountries.com/v3.1'
const GAME_DURATION = 60
const CACHE_DURATION = GAME_DURATION
const cache = new NodeCache()

export default class GamesController {
  public async startGame({ auth, response }: HttpContextContract) {
    try {
      const { data: countries } = await axios.get(`${COUNTRIES_API_URL}/all`)
      const filteredCountries = countries.filter(
        (country: any) => country.translations.fra.common.length < 30
      )

      const game = {
        id: auth.user!.id,
        score: 0,
        duration: CACHE_DURATION,
        usedCountries: [],
      }

      cache.set(`game_${game.id}`, game, CACHE_DURATION)
      cache.set(`countries_${game.id}`, filteredCountries, CACHE_DURATION)

      return response.ok(game)
    } catch (error) {
      return response.status(500).send('An error occurred while retrieving the list of countries')
    }
  }

  public async generateQuestion({ request, response }: HttpContextContract) {
    const gameId = request.param('gameId')
    const game = cache.get(`game_${gameId}`)

    if (!game) {
      return response.status(404).send('Game not found')
    }

    try {
      const { usedCountries } = game
      const allCountries = cache.get(`countries_${gameId}`)
      const filteredCountries = allCountries.filter(
        (country: any) =>
          country.translations.fra.common.length < 30 && !usedCountries.includes(country.cca3)
      )

      if (filteredCountries.length < 4) {
        game.usedCountries = []
        const { data: countries } = await axios.get(`${COUNTRIES_API_URL}/all`)
        cache.set(`game_${gameId}`, countries, CACHE_DURATION)
      }

      const shuffledData = filteredCountries.sort(() => Math.random() - 0.5)
      const randomCountries = shuffledData.slice(0, 4).map((country: any) => ({
        flag: country.flags.png,
        cca3: country.cca3,
        name: country.translations.fra.common,
      }))

      const randomIndex = Math.floor(Math.random() * 4)
      const question = randomCountries[randomIndex].flag
      const correctAnswer = randomCountries[randomIndex].cca3
      const id = uuid()

      const questionData = {
        id,
        question,
        randomCountries,
        correctAnswer,
      }

      cache.set(questionData.id, questionData, CACHE_DURATION)

      // Add used country to game's usedCountries array
      game.usedCountries.push(correctAnswer)
      cache.set(`game_${gameId}`, game, CACHE_DURATION)

      const randomCountriesWithOnlyName = randomCountries.map((country) => ({
        name: country.name,
        cca3: country.cca3,
      }))

      const responsePayload = {
        id,
        question,
        answers: randomCountriesWithOnlyName,
      }

      return response.ok(responsePayload)
    } catch (err) {
      return response.status(500).send('An error occurred while generating the question')
    }
  }

  public async checkAnswer({ auth, request, response }: HttpContextContract) {
    const id = request.param('id')
    const cca3 = request.param('cca3').toUpperCase()
    const question = cache.get(id)

    if (!question) {
      return response.status(404).send('Question not found')
    }

    const correctAnswer = question.correctAnswer

    const game = cache.get(`game_${auth.user!.id}`)

    if (!game) {
      return response.status(404).send('Game not found')
    }

    // Delete the question from the cache for prevent cheating
    cache.del(id)

    if (cca3 === correctAnswer) {
      game.score++
      cache.set(`game_${auth.user!.id}`, game, CACHE_DURATION)
      if (Number(auth.user!.best_score) < game.score) {
        console.log('game.score:', game.score)
        try {
          const user = await auth.user!.merge({ best_score: game.score }).save()
          console.log('user:', user.best_score)
        } catch (error) {
          console.log(error)
        }
      }

      return response.ok({ score: game.score })
    }
  }
}
