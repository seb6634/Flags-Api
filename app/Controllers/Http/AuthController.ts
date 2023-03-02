import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import LoginValidator from 'App/Validators/Auth/LoginValidator'
import StoreUserValidator from 'App/Validators/Auth/StoreUserValidator'
import UpdateUserValidator from 'App/Validators/Auth/UpdateUserValidator'
import { incorrectCredentials } from 'Config/errorMessages'
import Env from '@ioc:Adonis/Core/Env'

const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'mail.gmx.com',
  port: 587,
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },
  debug: true,
  auth: {
    user: Env.get('EMAIL_FROM'),
    pass: Env.get('EMAIL_PASSWORD'),
  },
})

const mailOptions = {
  from: Env.get('EMAIL_FROM'),
  to: Env.get('EMAIL_TO'),
  subject: "Nouveau compte d'utilisateur créé sur Countries API",
  text: '',
}
export default class AuthController {
  public async register({ request, response }: HttpContextContract) {
    const payload = await request.validate(StoreUserValidator)

    const user = await User.create(payload)
    mailOptions.text = `Utilisateur : ${user.username} - ${user.email}`

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error)
      } else {
        console.log('Email envoyé : ' + info.response)
      }
    })

    return response.created(user) // 201 CREATED
  }

  public async login({ auth, request, response }: HttpContextContract) {
    const { email, password } = await request.validate(LoginValidator)
    try {
      const token = await auth.attempt(email, password)
      const user = auth.user!

      return response.ok({
        token: token,
        ...user.serialize(),
      })
    } catch (error) {
      return response.status(400).send({ error: incorrectCredentials })
    }
  }

  public async me({ auth, response }: HttpContextContract) {
    return response.ok(auth.user)
  }

  public async update({ auth, request, response }: HttpContextContract) {
    const payload = await request.validate(UpdateUserValidator)

    const user = await auth.user!.merge(payload).save()

    return response.ok(user) // 200 OK
  }

  public async logout({ auth, response }: HttpContextContract) {
    await auth.logout()

    return response.noContent() // 204 NO CONTENT
  }

  public async deleteUser({ auth, response }) {
    const user = await User.find(auth.user.id)

    if (!user) {
      return response.status(404).json({
        message: 'User not found',
      })
    }

    await user.delete()

    return response.status(200).json({
      message: 'User deleted successfully',
    })
  }

  public async bestScore({ response }: HttpContextContract) {
    const users = await User.query().orderBy('best_score', 'desc')

    const usersWithBestScore = users.filter((user) => user.best_score !== null)

    const usersAllowShareScores = usersWithBestScore.filter((user) => user.score_sharing === 'true')

    const partialUsers = usersAllowShareScores.map((user) => {
      return {
        username: user.username,
        best_score: user.best_score,
        avatar: user.avatar,
      }
    })

    return response.ok(partialUsers)
  }
}
