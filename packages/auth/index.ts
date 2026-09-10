import { zenstackAdapter } from '@zenstackhq/better-auth';
import { betterAuth } from "better-auth";
import { openAPI, organization, twoFactor, phoneNumber, admin as adminPlugin } from 'better-auth/plugins'
import { sendEmail } from '@repo/email';
import { logger } from '@repo/logger';

import { zenstack } from '@repo/db';
import { ac, owner, admin } from './permissions';

export const auth = betterAuth({
  basePath: '/auth',
  database: zenstackAdapter(zenstack, {
    provider: 'postgresql',
  }),
  onAPIError: {
    onError: (err) => logger.auth.error({ err }, 'Auth API error'),
  },
  trustedOrigins: [
    String(process.env.APP_URL), String(process.env.API_URL)
  ],
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        void sendEmail({
          to: user.email,
          subject: 'Confirm your email change',
          text: `Confirm your email change to ${newEmail}: ${url}`
        })
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        void sendEmail({
          to: user.email,
          subject: 'Delete your account',
          text: `Delete your account: ${url}`
        })
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: 'Reset your password',
        text: `Reset your password: ${url}`
      })
    },
    onPasswordReset: async ({ user }) => {
      void sendEmail({
        to: user.email,
        subject: 'Password reset',
        text: 'Your password has been reset'
      })
    }
  },
  plugins: [
    phoneNumber(),
    openAPI(),
    adminPlugin(),
    organization({
      ac,
      roles: { owner, admin },
      dynamicAccessControl: {
        enabled: true,
      },
      sendInvitationEmail: async ({ email, role, organization, inviter, invitation }) => {
        void sendEmail({
          to: email,
          subject: `You've been invited to join ${organization.name}`,
          text: `${inviter.user.name} invited you to join ${organization.name}'s Organization as ${role}. Accept the invitation here: ${process.env.APP_URL}/auth/accept-invitation?id=${invitation.id}`,
        })
      },
    }),
    twoFactor(),
  ],
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      void sendEmail({
        to: user.email,
        subject: 'Verify your email',
        text: `Verify your email: ${url}`
      })
    }
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const organization = await zenstack.member.findFirst(({
            select: {
              organizationId: true
            },
            where: {
              userId: session.userId
            }
          }))
          return {
            data: {
              ...session,
              activeOrganizationId: organization?.organizationId,
            },
          };
        },
      },
    },
  },
});
