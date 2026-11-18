import { User as UserType } from "@/client/api/users"
import { FC } from "react"
import { Link } from "react-router"
import style from "./index.module.scss";

interface UserProps {
    user: UserType
}

const User: FC<UserProps> = ({ user }) => {
    return (
        <Link className={style.card} to={`/users/${user.id}`}>
            <div>{user.name}</div>
            <div>{user.email}</div>
        </Link>
    )
}

export default User