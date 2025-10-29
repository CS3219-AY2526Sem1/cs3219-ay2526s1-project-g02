export const REGISTER = /* GraphQL */ `
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      message
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      access_token
      refresh_token
      user { id email }
    }
  }
`;

export const DELETE_ACCOUNT_WITH_INPUT = `
  mutation DeleteAccount($input: DeleteAccountInput!) {
    deleteAccount(input: $input) {
      message
    }
  }
`;

export const VERIFY_PASSWORD = `
  mutation Verify($input: VerifyPasswordInput!) {
    verifyPassword(input: $input)
  }
`;

export const UPDATE_PASSWORD = `
  mutation UpdatePassword($input: UpdatePasswordInput!) {
    updatePassword(input: $input){
    }
    message
  }
`;

export const RESET_PASSWORD_LINK = `
  mutation ResetPasswordLink($input: ResetPasswordInput!) {
    resetPasswordLink(input: $input) {
      
      message
    }
  }
`;

export const IS_EMAIL_TAKEN = `
  query IsEmailTaken($email: String!) {
    isEmailTaken(email: $email)
  }
`;

export const IS_USERNAME_TAKEN = `
  query IsUsernameTaken($username: String!) {
    isUsernameTaken(username: $username)
  }
`;
