import { Inject, Injectable, Req, Res } from "@nestjs/common";
import { Request } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE, SUPABASE_ADMIN } from "../supabase/supabase.module";

@Injectable()
export class UsersService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient,
    @Inject(SUPABASE_ADMIN) private readonly supabaseAdmin: SupabaseClient
  ) {}

  async register(email: string, username: string, password: string) {
    console.log("📩 REGISTER DTO:", { email, username, password });
    const {
      data: { user },
      error,
    } = await this.supabase.auth.signUp({
      email: email,
      password: password,
    });

    console.log("USER", user, "ERROR", error);

    if (error) {
      throw error;
    }
    const userId = user?.id;

    const { data: userData, error: userError } = await this.supabase
      .from("users")
      .insert({ id: userId, email: email, username: username })
      .select();

    if (userError) {
      await this.supabaseAdmin.auth.admin.deleteUser(userId as string);
    }
  }

  async logIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    console.log("LOGIN DATA:", data, "LOGIN ERROR:", error);

    if (error) {
      throw new Error(error.message);
    }

    return {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      user: data.user,
    };
  }

  async resetPasswordLink(email: string) {
    try {
      await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:3000/update-password",
      });
      return { message: "Reset password email sent" };
    } catch (error) {
      console.error("Error sending reset password email:", error);
      return { message: "Error sending reset password email" };
    }
  }

  async updatePassword(password: string, req: Request) {
    try {
      const authHeader = req.headers.authorization as string | undefined;
      const accessToken = authHeader?.split(" ")[1];
      console.log("ACCESS TOKEN:", accessToken);

      const supabaseInstance = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SECRET_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        }
      );

      await supabaseInstance.auth.updateUser({ password: password });
      console.log("Password updated successfully");

      return { message: "Password updated successfully" };
    } catch (error) {
      console.error("Error updating password:", error);
      return { message: "Error updating password" };
    }
  }

  async isEmailTaken(email: string): Promise<boolean> {
    const { data: user } = await this.supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    return user !== null;
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const { data: user } = await this.supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();
    return user !== null;
  }

  async verifyPassword(email: string, password: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("Password verification failed:", error.message);
        return false;
      }

      if (data.session) {
        await this.supabase.auth.signOut();
      }

      return true;
    } catch (error) {
      console.error("Verify password error:", error);
      return false;
    }
  }
  async deleteAccountById(userId: string) {
    try {
      console.log(`Deleting account for user: ${userId}`);

      const { error: userTableError } = await this.supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userId);

      console.log("userTableError", userTableError);
      if (userTableError) throw userTableError;

      const { error: authError } =
        await this.supabaseAdmin.auth.admin.deleteUser(userId);

      console.log("authError", authError);
      if (authError) throw authError;

      return {
        deletedUserId: userId,
        message: "User data and auth account deleted.",
      };
    } catch (error) {
      console.error("deleteAccountById error:", error);
    }
  }
}
