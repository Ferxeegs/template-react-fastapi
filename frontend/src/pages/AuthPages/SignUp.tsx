import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpContactAdmin from "../../components/auth/SignUpContactAdmin";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="Registrasi Akun"
        description="Pendaftaran akun dilakukan melalui admin via WhatsApp"
      />
      <AuthLayout>
        <SignUpContactAdmin />
      </AuthLayout>
    </>
  );
}
