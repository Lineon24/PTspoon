import { useEffect, useState } from 'react';

interface Restaurant_menu {
  id: string;
  menu: string[];
  price: string;
}

const dummyMenus: Restaurant_menu[] = [
  {
    id: '1',
    menu: ['김치찌개', '된장찌개'],
    price: '7000',
  },
  {
    id: '2',
    menu: ['돈까스', '치킨까스'],
    price: '8500',
  },
];

export default function RestaurantMenus() {
  const [restaurantMenus, setRestaurantMenus] = useState<Restaurant_menu[] | null>(null);

  useEffect(() => {
    // DB 대신 더미 메뉴 넣기
    setRestaurantMenus(dummyMenus);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">전체 레스토랑 메뉴</h2>
      {restaurantMenus ? (
        restaurantMenus.map((menuGroup) => (
          <div key={menuGroup.id} className="mb-4 p-2 border rounded">
            <h3 className="font-semibold">레스토랑 ID: {menuGroup.id}</h3>
            <p>가격: {menuGroup.price}원</p>
            <ul className="list-disc pl-5">
              {menuGroup.menu.map((menu, index) => (
                <li key={index}>{menu}</li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <p>메뉴를 불러오는 중...</p>
      )}
    </div>
  );
}
