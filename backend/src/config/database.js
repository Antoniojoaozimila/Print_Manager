import './loadEnv.js';

const common = {
  dialect: 'mysql',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
};

export default {
  development: {
    ...common,
    use_env_variable: 'DATABASE_URL',
    url: process.env.DATABASE_URL,
  },
  test: {
    ...common,
    use_env_variable: 'DATABASE_URL',
    url: process.env.DATABASE_URL,
  },
  production: {
    ...common,
    use_env_variable: 'DATABASE_URL',
    url: process.env.DATABASE_URL,
  },
};
