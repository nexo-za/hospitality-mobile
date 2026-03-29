import React from "react";
import { LoadingSpinner } from "./LoadingSpinner";
import { ErrorMessage } from "./ErrorMessage";
import { useApi } from "../hooks/useApi";

interface WithApiDataProps<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  children: (data: T) => React.ReactNode;
  fullScreen?: boolean;
}

export function WithApiData<T>({
  data,
  loading,
  error,
  onRetry,
  children,
  fullScreen = false,
}: WithApiDataProps<T>) {
  if (loading) {
    return <LoadingSpinner fullScreen={fullScreen} />;
  }

  if (error) {
    return (
      <ErrorMessage
        message={error.message}
        onRetry={onRetry}
        fullScreen={fullScreen}
      />
    );
  }

  if (!data) {
    return null;
  }

  return <>{children(data)}</>;
}

// Example usage:
// const MyComponent = () => {
//   const { data, loading, error, execute } = useApi<UserData>();
//
//   useEffect(() => {
//     execute(() => apiService.getUserData(userId));
//   }, [userId, execute]);
//
//   return (
//     <WithApiData
//       data={data}
//       loading={loading}
//       error={error}
//       onRetry={() => execute(() => apiService.getUserData(userId))}
//     >
//       {(userData) => (
//         <View>
//           <Text>{userData.name}</Text>
//         </View>
//       )}
//     </WithApiData>
//   );
// };
