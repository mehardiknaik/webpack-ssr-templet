import { User as UserType } from "@/client/api/users"
import { FC } from "react"
import { Link } from "react-router"
import style from "./index.module.scss";

interface UserProps {
    user: UserType
}

const User: FC<UserProps> = ({ user }) => {
    return (<li className={style.item}>
        <Link to={`/users/${user.id}`}>{user.name}</Link>
    </li>)
}

export default User