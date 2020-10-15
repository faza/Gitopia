import Hammer from "rc-hammerjs"
import * as React from "react"
import { Redirect, Route, Switch } from "react-router-dom"
import { CSSTransition, TransitionGroup } from "react-transition-group"
import { connector } from "../../../actionCreators/index"
import { StackRouter } from "../../utils/StackRouter"
import BreadcrumbHistory from "../BreadcrumbHistory/BreadcrumbHistory"
import { Commits } from "../commits"
import { Dashboard } from "../Dashboard/Dashboard"
import Header from "../Header/Header"
import PullRequest from "../PullRequest"
import { Repositories } from "../Repositories"
import { Sidebar } from "../Sidebar/Sidebar"
import s from "./Layout.module.scss"
import dlogo from "../../argit/images/dlogo.svg"
import { Sponsor } from "../Sponsor"
import { Link } from "react-router-dom"
import { GoArrowLeft, GoArrowRight } from "react-icons/go"
import { FaCheckCircle, FaSpinner, FaPlus } from "react-icons/fa"
import { format } from "date-fns"

import {
  PopoverBody,
  PopoverHeader,
  UncontrolledPopover,
  Container,
  Row,
  Col
} from "reactstrap"
import { lifecycle } from "recompose"
import { openCreateRepoModal } from "../../../reducers/app"
import { arweave } from "../../../../index"
import { getAllActivities, txQuery } from "../../../../utils"

import NewContainer, {
  Icon,
  List,
  SubmitButton,
  Form
} from "../../argit/Repository/Container"
import {
  Owner,
  OwnerProfile,
  RepoInfo,
  FilterList,
  IssueList
} from "../../argit/Repository/RepositoryStyles"
import {
  loadAddress,
  loadNotifications,
  Notification,
  Repository,
  setIsAuthenticated,
  updateRepositories,
  openSponsorModal,
  loadActivities,
  setTxLoading,
  updateMainItems,
  updatePage,
  updateFilterIndex,
  Activity
} from "../../../reducers/argit"
import { FaAward, FaRegFileAlt } from "react-icons/fa"

type ConnectedProps = {
  isAuthenticated: boolean
  repositories: Repository[]
  setIsAuthenticated: typeof setIsAuthenticated
  loadAddress: typeof loadAddress
  updateRepositories: typeof updateRepositories
  openCreateRepoModal: typeof openCreateRepoModal
  loadNotifications: typeof loadNotifications
  notifications: typeof Notification[]
  setTxLoading: typeof setTxLoading
  txLoading: boolean
  mainItems: { repos: {}; activities: {} }
  updateMainItems: typeof updateMainItems
  openSponsorModal: typeof openSponsorModal
  filterIndex: Number
  updateFilterIndex: typeof updateFilterIndex
  loadActivities: typeof loadActivities
  activities: Activity[]
  updatePage: typeof updatePage
  page: string
}

export const Layout = connector(
  state => ({
    address: state.argit.address,
    isAuthenticated: state.argit.isAuthenticated,
    sidebarPosition: state.navigation.sidebarPosition,
    sidebarVisibility: state.navigation.sidebarVisibility,
    notifications: state.argit.notifications,
    repositories: state.argit.repositories,
    activities: state.argit.activities,
    filterIndex: state.argit.filterIndex,
    repository: state.argit.repository,
    page: state.argit.page,
    mainItems: state.argit.mainItems
  }),
  actions => ({
    openLoginModal: actions.argit.openLoginModal,
    openSidebar: actions.navigation.openSidebar,
    setIsAuthenticated: actions.argit.setIsAuthenticated,
    updateRepositories: actions.argit.updateRepositories,
    loadNotifications: actions.argit.loadNotifications,
    updateFilterIndex: actions.argit.updateFilterIndex,
    updateMainItems: actions.argit.updateMainItems,
    updatePage: actions.argit.updatePage,
    setTxLoading: actions.argit.setTxLoading,
    loadAddress: actions.argit.loadAddress,
    loadActivities: actions.argit.loadActivities
  }),
  lifecycle<ConnectedProps, {}>({
    async componentDidMount() {
      console.log(this.props)
      if (this.props.match.params.repo_name) {
        this.props.updatePage({ page: "repo" })
      } else {
        this.props.updatePage({ page: "main" })
      }

      this.props
        // UI Boot
        // await delay(150)
        .setTxLoading({ loading: true })
      this.props.updateFilterIndex({ filterIndex: 0 })
      const { isAuthenticated, repositories, ...actions } = this.props
      let address = this.props.match.params.wallet_address

      if (isAuthenticated) {
        address = await arweave.wallets.jwkToAddress(
          JSON.parse(String(sessionStorage.getItem("keyfile")))
        )
      }

      actions.loadAddress({ address })
      const activities = await getAllActivities(arweave, address)
      console.log(activities)

      actions.loadActivities({ activities: activities })
      const txids = await arweave.arql(txQuery(address, "create-repo"))
      let notifications: Notification[] = []
      let completed_txids: String[] = []
      const repos = await Promise.all(
        txids.map(async txid => {
          let repository = {} as Repository
          try {
            const data: any = await arweave.transactions.getData(txid, {
              decode: true,
              string: true
            })
            // if (typeof data === "object") {
            //   console.log(new TextDecoder("utf-8").decode(data))
            // }
            if (typeof data === "string" && data !== "") {
              const decoded: any = JSON.parse(data)
              repository = {
                name: decoded.name,
                description: decoded.description,
                txid: txid,
                status: "confirmed"
              }
              completed_txids.push(txid)
            } else if (data === "") {
              repository = {
                name: "Arweave server error",
                description: "Arweave server error",
                txid: txid,
                status: "confirmed"
              }
              completed_txids.push(txid)
            } else {
              throw new Error("Pendng Transaction")
            }
          } catch (error) {
            repository = {
              name: "Pending",
              txid: txid,
              status: "pending",
              description: "Pending"
            }
            notifications.push({
              type: "pending",
              action: "Create Repo",
              txid: txid
            })
          }

          if (!repository) {
            repository = {
              txid: txid,
              description: "Pending",
              status: "pending",
              name: "Pending"
            }
          }

          return repository
        })
      )
      const newNotifications = this.props.notifications
        .filter(
          notif =>
            notif.type == "pending" && completed_txids.includes(notif.txid)
        )
        .map(notif => ({
          type: "confirmed",
          action: "Create Repo",
          txid: notif.txid
        }))
      let finalNotifications = [...notifications, ...newNotifications]
      actions.loadNotifications({ notifications: finalNotifications })
      actions.updateRepositories({ repositories: repos })
      let names: string[] = []
      let objects: {} = {}
      this.props.repositories.forEach(item => {
        let itemname = item.name
        names.push(item.name)
        objects[itemname] = item
      })
      console.log(objects)
      actions.updateMainItems({
        mainItem: {
          repos: objects,
          activities: this.props.mainItems.activities
        }
      })
      this.props.setTxLoading({ loading: false })
    }
  })
)(function LayoutImpl(props) {
  function handleChange(e: string) {
    let names: string[] = []
    let objects: {} = {}
    props.repositories.forEach(item => {
      let itemname = item.name
      names.push(item.name)
      objects[itemname] = item
    })
    const results = filter(names, e.target.value)
    props.updateMainItems({
      mainItems: { repos: objects, activities: {} }
    })
  }
  let mainFilters = [
    { state: "repos", label: "Repositories", active: true },
    { state: "activity", label: "Activity", active: false },
    { state: "overview", label: "Overview", active: false }
  ]
  let repoFilters = [
    { state: "code", label: "Code", active: true },
    { state: "commits", label: "Commits", active: false },
    { state: "sponsors", label: "Sponsors", active: false }
  ]
  function handleFilter(index: number, page: string) {
    props.updateFilterIndex({ filterIndex: index })
    let names: [] = []
    let objects: {} = {}
    props.updateFilterIndex({ filterIndex: index })
    if (page === "main") {
      if (index == 0) {
        props.repositories.forEach(item => {
          let itemname = item.name
          // names.push(item.name)
          objects[itemname] = item
        })
        props.updateMainItems({
          mainItems: { repos: objects, activities: {} }
        })
      } else if (index === 1) {
        console.log(props.activities)

        props.activities.forEach(item => {
          let itemname = item.txid
          // names.push(item.txid)
          objects[itemname] = item
        })
        props.updateMainItems({
          mainItems: { repos: {}, activities: objects }
        })
      } else if (index === 2) {
        // props.updateMainItems({
        //   mainItems: {
        //     repos: props.mainItems.repos,
        //     activities: props.mainItems.activities
        //   }
        // })
      }
    } else if (page === "repo") {
      if (index == 1) {
      }
    }
  }
  const { activities, repos } = props.mainItems

  return (
    <div className="app-body">
      <nav className="landing-nav">
        <div
          className="landing-logo"
          onClick={() =>
            props.isAuthenticated
              ? window.location.replace(`/#/${props.address}`)
              : window.location.replace(`/`)
          }
        >
          <img src={dlogo} height="48px" width="48px" />
        </div>
        {props.isAuthenticated && (
          <Header
            {...props}
            setIsAuthenticated={props.setIsAuthenticated}
            updateRepositories={props.updateRepositories}
            updateNotifications={props.loadNotifications}
            notifications={props.notifications}
            address={props.address}
          />
        )}
        {!props.isAuthenticated && (
          <ul className="landing-menu">
            {/* <li className="landing-menu__item">
  <a
    href="doc.html"
    className="landing-a landing-link landing-link--dark"
  >
    <i className="fa fa-book" /> Documentation
  </a>
</li> */}
            <li className="landing-menu__item landing-toggle">
              <a
                onClick={() => props.openLoginModal({})}
                className="landing-a landing-link landing-link--dark"
              >
                <i className="fa fa-sign-in" /> Login
              </a>
            </li>
            <li className="landing-menu__item">
              <a
                onClick={() => props.openLoginModal({})}
                className="landing-a landing-link landing-link--dark"
              >
                <i className="fa fa-sign-in" /> Login
              </a>
            </li>
          </ul>
        )}
      </nav>
      <Hammer>
        <main className={s.content}>
          {/* <Repositories {...props} /> */}
          {/* {props.isAuthenticated && (
            <BreadcrumbHistory url={props.location.pathname} />
          )} */}

          <TransitionGroup>
            <CSSTransition
              key={props.location.key}
              classNames="fade"
              timeout={200}
            >
              <NewContainer>
                <Icon>
                  <img src={dlogo} height="48px" width="48px" />
                </Icon>
                <Owner>
                  <div>
                    {props.page === "repo" && (
                      <Link
                        to={`/${props.repository.owner.name}`}
                        onClick={() => {
                          props.updatePage({ page: "main" })
                          props.updateFilterIndex({ filterIndex: 0 })
                        }}
                      >
                        <GoArrowLeft /> Back to Repositories
                      </Link>
                    )}
                  </div>
                  <OwnerProfile>
                    <a
                      href={`/${props.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={`https://api.adorable.io/avatars/100/${
                          props.address
                        }.png`}
                        alt={`${props.address}`}
                      />
                    </a>
                    {props.page === "repo" && (
                      <>
                        <h2 className="d-md-none">
                          {props.repository.owner.name.replace(
                            /(.{7})..+/,
                            "$1..."
                          )}
                        </h2>
                        <h2 className="d-none d-md-block">
                          {props.repository.owner.name}
                        </h2>
                      </>
                    )}
                  </OwnerProfile>
                  <RepoInfo>
                    {props.page === "repo" && (
                      <h1>
                        <a
                          href={props.repository.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {props.repository.name}
                        </a>
                      </h1>
                    )}
                    {props.page === "main" && (
                      <h1>
                        <a
                          href={`/${props.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {props.repository.owner.name}
                        </a>
                      </h1>
                    )}

                    <div>
                      <span
                        className="rv-button"
                        onClick={() => {
                          props.openSponsorModal({})
                        }}
                      >
                        <FaAward />
                        Sponsor
                      </span>
                      {props.page === "repo" && (
                        <span id="clone_button" className="rv-button">
                          <FaRegFileAlt /> Clone
                          <UncontrolledPopover
                            className="rv-pop"
                            placement="top-end"
                            trigger="legacy"
                            target="clone_button"
                          >
                            <PopoverHeader>Clone with dgit</PopoverHeader>
                            <PopoverBody>{`dgit://${
                              props.repository.owner.name
                            }/${props.repository.name}`}</PopoverBody>
                          </UncontrolledPopover>
                        </span>
                      )}
                    </div>
                  </RepoInfo>
                </Owner>
                <IssueList>
                  <FilterList active={Number(props.filterIndex)}>
                    {props.page === "main" &&
                      mainFilters.map((filter, index) => (
                        <button
                          type="button"
                          key={filter.state}
                          onClick={() => handleFilter(index, props.page)}
                        >
                          {filter.label}
                        </button>
                      ))}
                    {props.page === "repo" &&
                      repoFilters.map((filter, index) => (
                        <button
                          type="button"
                          key={filter.state}
                          onClick={() => handleFilter(index, props.page)}
                        >
                          {filter.label}
                        </button>
                      ))}
                  </FilterList>

                  {props.filterIndex === 0 &&
                    props.page === "main" && (
                      <Form>
                        <input
                          type="text"
                          placeholder="Search Repository"
                          onChange={handleChange}
                        />
                        {props.isAuthenticated && (
                          <SubmitButton
                            onClick={() => {
                              props.openCreateRepoModal({})
                            }}
                            loading={props.txLoading ? 1 : 0}
                          >
                            <FaPlus color="#fff" size={14} />
                          </SubmitButton>
                        )}
                      </Form>
                    )}

                  <List>
                    {props.page === "main" &&
                      props.filterIndex == 0 &&
                      props.repositories &&
                      Object.keys(repos).map(name => (
                        <li key={name}>
                          <div>
                            {repos[name] &&
                              !repos[name].type && (
                                <Link
                                  to={`/${props.address}/${name}`}
                                  onClick={() => {
                                    props.updatePage({ page: "repo" })
                                  }}
                                >
                                  <img
                                    src={`https://api.adorable.io/avatars/100/${name}.png`}
                                    alt={name}
                                  />
                                  <span>{name}</span>
                                </Link>
                              )}
                          </div>
                          {repos[name] &&
                            repos[name].status === "confirmed" && (
                              <button>
                                <FaCheckCircle />
                              </button>
                            )}
                          {repos[name] &&
                            repos[name].status === "pending" && (
                              <button>
                                <FaSpinner />
                              </button>
                            )}
                        </li>
                      ))}
                    {props.page === "main" &&
                      props.filterIndex == 1 &&
                      props.activities &&
                      Object.keys(activities).map(txid => (
                        <li key={txid}>
                          <div>
                            <Link
                              to={`/${props.address}/${activities[txid]
                                .repoName || activities[txid].key}`}
                            >
                              <Container className="activity">
                                <Row>
                                  <Col>
                                    <span>
                                      {`${txid}`.replace(/(.{15})..+/, "$1...")}
                                    </span>
                                  </Col>
                                  <Col>
                                    {activities[txid].repoName ||
                                      activities[txid].key}
                                  </Col>
                                  <Col>
                                    <span className="float-right">
                                      {format(
                                        parseInt(activities[txid].unixTime) *
                                          1000,
                                        "MM/DD HH:mm"
                                      )}
                                    </span>
                                  </Col>
                                  <Col>
                                    <span>
                                      {activities[txid].type === "create-repo"
                                        ? activities[txid].value
                                        : `Updated ref ${activities[txid].key}`}
                                    </span>
                                  </Col>
                                </Row>
                              </Container>
                            </Link>
                          </div>
                        </li>
                      ))}
                    {props.page === "repo" &&
                      props.filterIndex === 0 && <StackRouter {...props} />}
                    {props.page === "repo" &&
                      props.filterIndex === 1 && <Commits {...props} />}
                  </List>
                  <Switch>
                    <Route
                      path="/:wallet_address/:repo_name/commits/:branch?"
                      exact
                      component={Commits}
                    />
                  </Switch>
                </IssueList>
              </NewContainer>
            </CSSTransition>
          </TransitionGroup>
        </main>
      </Hammer>
      <footer className="landing-footer">
        Made with <span style={{ color: "#e25555" }}>&#9829;</span>
        &nbsp; by{" "}
        <span className="font-bold">
          <a
            href="https://thechtrap.com/"
            target="_blank"
            className="landing-a landing-link link--dark"
          >
            TheTechTrap
          </a>
        </span>
        .
      </footer>
    </div>
  )
})
