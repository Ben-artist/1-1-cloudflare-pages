import ChatBox from "./components/ChatBox.jsx";
import {
  ApolloClient,
  InMemoryCache,
  ApolloProvider,
  HttpLink,
} from "@apollo/client";

// 创建 Apollo Client 实例
const client = new ApolloClient({
  link: new HttpLink({
    uri: "https://deepseek-graphql.2939117014tsk.workers.dev/", // 后端 GraphQL 端点
  }),
  cache: new InMemoryCache(),
});

function App() {
  return (
    <ApolloProvider client={client}>
      <div className="min-h-screen bg-gray-50">
        <ChatBox client={client} />
      </div>
    </ApolloProvider>
  );
}

export default App;
