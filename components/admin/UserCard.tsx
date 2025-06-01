import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ShoppingCart, Truck, CheckCircle } from "lucide-react";

interface UserCardProps {
  ordersCount: number;
  usersCount: number;
  suppliersCount: number;
  acceptedDemandsCount: number; // New prop for accepted demands
}

const UserCard: React.FC<UserCardProps> = ({
  ordersCount,
  usersCount,
  suppliersCount,
  acceptedDemandsCount,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6"> {/* Changed to 4 columns */}
      {[
        {
          title: "Commandes",
          count: ordersCount,
          icon: <ShoppingCart className="text-blue-500 w-8 h-8" />,
          bgColor: "bg-[#C08493]",
        },
        {
          title: "Utilisateurs",
          count: usersCount,
          icon: <Users className="text-green-500 w-8 h-8" />,
          bgColor: "bg-[#8CACD3]",
        },
        {
          title: "Fournisseurs",
          count: suppliersCount,
          icon: <Truck className="text-orange-500 w-8 h-8" />,
          bgColor: "bg-[#ABD8DF]",
        },
        {
          title: "Demandes Acceptées",
          count: acceptedDemandsCount,
          icon: <CheckCircle className="text-purple-500 w-8 h-8" />, // New icon for accepted demands
          bgColor: "bg-[#A78BFA]", // New background color (purple-ish)
        },
      ].map((card, index) => (
        <Card
          key={index}
          className={`shadow-xl transform transition duration-300 hover:scale-105 ${card.bgColor} text-white`}
        >
          <CardHeader className="flex flex-row items-center justify-between p-4">
            <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
            {card.icon}
          </CardHeader>
          <CardContent className="p-4 text-center">
            <p className="text-4xl font-bold">{card.count}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default UserCard;