export const queryKeys = {
  auth: { me: ["auth", "me"] },
  categories: { all: ["categories"] },
  blogs: { all: ["blogs"] },
  admin: {
    stats: ["admin", "stats"],
    products: (params = {}) => ["admin", "products", params],
    orders: (params = {}) => ["admin", "orders", params],
    users: (params = {}) => ["admin", "users", params],
  },
};

export default queryKeys;
