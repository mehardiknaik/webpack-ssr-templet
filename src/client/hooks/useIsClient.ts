import useIsServer from "./useIsServer"

const useIsClient = () => {
    const isServer = useIsServer();
    return !isServer
}

export default useIsClient