import * as React from "react"
import { Link } from "react-router-dom"
import { connector } from "../../actionCreators/index"
import { lifecycle } from "recompose"
import { arweave } from "../../../index"

import {
  Repository,
  setIsAuthenticated,
  loadAddress,
  updateRepositories
} from "../../reducers/argit"
import { txQuery } from "../../../utils"

type ConnectedProps = {
  isAuthenticated: boolean
  repositories: Repository[]
  setIsAuthenticated: typeof setIsAuthenticated
  loadAddress: typeof loadAddress
  updateRepositories: typeof updateRepositories
}

export const Repositories = connector(
  state => ({
    repositories: state.argit.repositories,
    address: state.argit.address,
    isAuthenticated: state.argit.isAuthenticated
  }),
  actions => ({
    loadAddress: actions.argit.loadAddress,
    updateRepositories: actions.argit.updateRepositories
  }),
  lifecycle<ConnectedProps, {}>({
    async componentDidMount() {
      // UI Boot
      // await delay(150)

      const { isAuthenticated, repositories, ...actions } = this.props

      if (isAuthenticated) {
        const address = await arweave.wallets.jwkToAddress(
          JSON.parse(String(sessionStorage.getItem("keyfile")))
        )
        actions.loadAddress({ address })

        const txids = await arweave.arql(txQuery(address, "create-repo"))

        const repositories = await Promise.all(
          txids.map(async txid => {
            let repository = {} as Repository
            const data: any = await arweave.transactions.getData(txid, {
              decode: true,
              string: true
            })
            try {
              const decoded: any = JSON.parse(data)
              repository = {
                name: decoded.name,
                description: decoded.description
              }
            } catch (error) {
              repository = {
                name: txid,
                description: "Pending confirmation"
              }
            }

            if (!repository) {
              repository = {
                name: txid,
                description: "null"
              }
            }

            return repository
          })
        )
        actions.updateRepositories({ repositories })
      }
    }
  })
)(function RepositoriesImpl(props) {
  return (
    <React.Fragment>
      <h1>
        Repositories{" "}
        <Link to="/new">
          <i className="fa fa-plus-circle" aria-hidden="true" />
        </Link>
      </h1>

      {props.repositories &&
        props.repositories.map(
          repository =>
            repository.name && (
              <div key={repository.name} className="card mt-4">
                <div className="card-body">
                  <Link to={`/${props.address}/${repository.name}`}>
                    {repository.name}
                  </Link>
                  <p>{repository.description}</p>
                </div>
              </div>
            )
        )}
    </React.Fragment>
  )
})