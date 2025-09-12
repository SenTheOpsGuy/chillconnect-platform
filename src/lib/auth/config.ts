import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" }
      },
      async authorize(credentials) {
        console.log('🔐 Authorize called with:', { 
          email: credentials?.email, 
          hasPassword: !!credentials?.password,
          hasToken: !!credentials?.token
        });
        
        // Handle OTP login with user data from successful verification
        if (credentials?.token && credentials?.email && credentials?.token !== 'password') {
          console.log('✅ OTP login credentials detected');
          
          try {
            // Parse user data from OTP verification
            const userData = JSON.parse(credentials.token);
            
            console.log('✅ OTP user data parsed:', { 
              email: userData.email, 
              role: userData.role 
            });
            
            return {
              id: userData.id,
              email: userData.email,
              role: userData.role,
              name: userData.profile ? `${userData.profile.firstName} ${userData.profile.lastName}` : userData.email
            };
          } catch (error) {
            console.error('❌ Error parsing OTP user data:', error);
            return null;
          }
        }
        
        if (!credentials?.email || !credentials?.password) {
          console.log('❌ Missing email or password');
          return null;
        }
        
        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { profile: true }
          });
          
          if (!user) {
            console.log('❌ No user found with email:', credentials.email);
            return null;
          }
          
          console.log('✅ User found:', { email: user.email, role: user.role, hasPassword: !!user.password });
          
          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          if (!passwordMatch) {
            console.log('❌ Password mismatch for user:', credentials.email);
            return null;
          }
          
          console.log('✅ Password match successful for:', credentials.email);
          
          const returnUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.profile ? `${user.profile.firstName} ${user.profile.lastName}` : user.email
          };
          
          console.log('✅ Returning user:', returnUser);
          return returnUser;
        } catch (error) {
          console.error('🔥 Database error during auth:', error);
          return null;
        }
      }
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};