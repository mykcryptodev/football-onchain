import { createThirdwebClient } from "thirdweb";
import { ThirdwebProvider as ThirdwebProviderComponent } from "thirdweb/react";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ?? "",
});

export const ThirdwebProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <ThirdwebProviderComponent>{children}</ThirdwebProviderComponent>;
};

export default ThirdwebProvider;
