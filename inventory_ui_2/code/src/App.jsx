import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css'
import Spinner from 'react-bootstrap/Spinner'
import Card from 'react-bootstrap/Card'
import Container from 'react-bootstrap/Container'
import { MQTTProvider } from './MQTTContext'
import React from 'react';
import { custom_new_message_action, CustomReducer } from './custom_mqtt';
import { ToastProvider } from './ToastContext'
import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'

import {
  QueryClient,
  QueryClientProvider,
} from 'react-query'

import './app.css'

import { NewDeliveryPage } from './pages/new_delivery'
import { AdminPage } from './pages/manage_minimums_page';
import { OverviewPage } from './pages/overview';
import { WithdrawPage } from './pages/withdraw_page';
import { TransferPage } from './pages/transfer_page';

// import * as dayjs from 'dayjs'
// import * as duration from 'dayjs/plugin/duration';
// import * as relativeTime from 'dayjs/plugin/relativeTime';
import { load_config } from './fetch_data';
import { HistoryPage } from './pages/history_page';

// dayjs.extend(duration);
// dayjs.extend(relativeTime)


// Create a client
const queryClient = new QueryClient()

function App() {
  let [loaded, setLoaded] = React.useState(false)
  let [pending, setPending] = React.useState(false)
  let [error, setError] = React.useState(null)

  let [config, setConfig] = React.useState([])

  let load_config_callback = React.useCallback(load_config, [])

  React.useEffect(() => {
    if (!loaded && !pending) {
      load_config_callback(setPending, setLoaded, setError, setConfig)
    }
  }, [load_config_callback, loaded, pending])

  if (!loaded) {
    return <Container fluid="md">
      <Card className='mt-2 text-center'>
        {error !== null ? <h1>{error}</h1> : <div><Spinner></Spinner> <h2 className='d-inline'>Loading Config</h2></div>}
      </Card>
    </Container>
  } else {
    return (
      <MQTTProvider
        host={config?.mqtt?.host ? config.mqtt.host : document.location.hostname}
        port={config?.mqtt?.port ?? 9001}
        prefix={config?.mqtt?.prefix ?? []}
        subscriptions={[]}
        new_message_action={custom_new_message_action}
        reducer={CustomReducer}
        initial_state={{}}
        debug={true}
      >
        <QueryClientProvider client={queryClient}>
          <ToastProvider position='bottom-end'>
            <BrowserRouter>
              <Routing config={config} />
            </BrowserRouter>
          </ToastProvider>
        </QueryClientProvider>
      </MQTTProvider>
    )
  }
}


function Routing(props) {
  return (
    <Routes>
      <Route path='/' element={<Base {...props}/>}>
        <Route path="/admin" element={<AdminPage {...props} />} />
        <Route path="/withdraw" element={<WithdrawPage {...props} />} />
        <Route path="/transfer" element={<TransferPage {...props} />} />
        <Route path="/history" element={<HistoryPage {...props} />} />

        <Route index element={<OverviewPage {...props} />}></Route>
      </Route>
    </Routes>
  )
}

function Base({ }) {
  return <Container fluid className="p-0 px-2 d-flex flex-column">
    <Container fluid className="flex-grow-1 p-0 mb-5 ">
          <Outlet />
    </Container>
  </Container>
}


export default App;
