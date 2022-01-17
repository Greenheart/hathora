import React, { useRef, useLayoutEffect, useContext, useState, useEffect } from "react";
import { toast } from "react-toastify";
import { MinusSmIcon, PlusSmIcon, UserCircleIcon } from "@heroicons/react/solid";
import { getUserDisplayName, lookupUser, UserData } from "./base";
import { RtagConnection } from "./client";
import { RtagContext } from "./context";
import {
  PlayerState as UserState,
  Direction,
  Point,
  Player,
  PlayerState,
  UserId,
} from "./types";
import PlayerStatePlugin from "../plugins/PlayerState";

window.customElements.define("player-state-plugin", PlayerStatePlugin);

function KVDisplay(props: { label: string; children: JSX.Element }) {
  return (
    <div className="kv-display">
      <span className="font-bold">{props.label}: </span>
      {props.children}
    </div>
  );
}

function ArrayDisplay<T>(props: { value: T[]; children: (value: T) => JSX.Element }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(props.value &&
    ((typeof props.value[0] === "object" && props.value.length > 7) || props.value.length > 4));

  let icon;
  if (isCollapsed) {
    icon = <PlusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  } else {
    icon = <MinusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  }
  return (
    <span className={`array-display`}>
      {props.value && props.value.length > 0 && (
        <span className="align-middle mr-0.5">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {icon}
          </button>
        </span>
      )}
      [
      {props.value && props.value.length > 0 && (
        <>
          {!isCollapsed && (<br />)}
          <span className="ml-3 text-sm italic text-gray-500">
            {props.value.length} {props.value.length === 1 ? "item" : "items"}
          </span>
          {!isCollapsed && (
            <div className={`p-1 m-1 bg-gray-100 border rounded flex ${typeof props.value[0] === "object" ? "flex-row overflow-x-auto" : "flex-col array-max-height overflow-y-auto"}`}>
              {props.value.map((val, i) => (
                <div className={`${typeof props.value[0] === "object" ? "array-item-object" : "array-item pl-2"}`} key={i}>
                  {props.children(val)}
                </div>
              ))}
            </div>
          )}
          {isCollapsed && "..."}
        </>
      )}
      ]
    </span>
  );
}

function OptionalDisplay<T>(props: { value: T | undefined; children: (value: T) => JSX.Element }) {
  if (props.value === undefined) {
    return <span className="text-sm italic text-gray-500">none</span>
  }
  return <span className="optional-display">{props.children(props.value)}</span>;
}

function EnumDisplay(props: { value: number; enum: object }) {
  const labels = Object.entries(props.enum)
    .filter(([_, value]) => typeof value === "number")
    .map(([label, _]) => label);
  return <span className="enum-display">{labels[props.value]}</span>;
}

function UserIdDisplay({ value }: { value: string }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [userData, setUserData] = useState<UserData>();
  useEffect(() => {
    lookupUser(value).then(setUserData);
  }, [value]);
  if (userData === undefined) {
    return (
      <div className="p-1 m-1 bg-white border rounded object-display">
        <span className="user-display flex items-center">
          <UserCircleIcon className="inline flex-shrink-0 mr-1.5 h-5 w-5 text-gray-500" aria-hidden="true" />
          {value}
        </span>
      </div>
    );
  }

  let icon;
  if (isCollapsed) {
    icon = <PlusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  } else {
    icon = <MinusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  }

  return (
    <div className="p-1 m-1 bg-white border rounded object-display">
      <div className="flex justify-between items-center">
        <span className="user-display flex items-center">
          <UserCircleIcon
            className="inline align-middle flex-shrink-0 mr-1.5 h-5 w-5 text-gray-500"
            aria-hidden="true"
          />
          {getUserDisplayName(userData)}
        </span>

        <span className="align-middle mr-0.5 ml-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {icon}
          </button>
        </span>
      </div>
      {!isCollapsed && (
        <div className="mt-1">
          <div className="kv-display">
            <span className="font-bold">UserId: </span>
            <StringDisplay value={userData.id} />
          </div>
          <div className="kv-display">
            <span className="font-bold">type: </span>
            <StringDisplay value={userData.type} />
          </div>
        </div>
      )}
    </div>
  );
}

function StringDisplay({ value }: { value: string }) {
  return <span className="string-display">"{value}"</span>;
}

function IntDisplay({ value }: { value: number }) {
  return <span className="int-display">{value}</span>;
}

function FloatDisplay({ value }: { value: number }) {
  return <span className="float-display">{value}</span>;
}

function BooleanDisplay({ value }: { value: boolean }) {
  return <span className="boolean-display">{value ? "true" : "false"}</span>;
}

function PluginDisplay<T>({
  value,
  component,
  isCollapsible,
}: {
  value: T;
  component: string;
  isCollapsible: boolean;
}) {
  const { connection, user, state, updatedAt } = useContext(RtagContext)!;
  const ref = useRef<{ val: T; client: RtagConnection; user: UserData; state: UserState; updatedAt: number }>();
  const displayError = (e: CustomEvent) => toast.error(e.detail);
  useLayoutEffect(() => {
    if (ref.current) {
      ref.current.val = value;
      ref.current.client = connection;
      ref.current.user = user;
      ref.current.state = state;
      ref.current.updatedAt = updatedAt;
      (ref.current as any).addEventListener("error", displayError);
      return () => {
        (ref.current as any).removeEventListener("error", displayError);
      };
    }
  });
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let icon;
  if (isCollapsed) {
    icon = <PlusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  } else {
    icon = <MinusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  }
  return (
    <>
      {!isCollapsed ? (
        <div>
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <div className="p-1 plugin-display">{React.createElement(component, { ref })}</div>
        </div>
      ) : (
        <div className="p-1 m-1 bg-white border rounded object-display">
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <span className="text-sm italic text-gray-500">plugin collapsed</span>
        </div>
      )}
    </>
  );
}

function PointDisplay({ value, isCollapsible }: { value: Point, isCollapsible: boolean  }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let icon;
  if (isCollapsed) {
    icon = <PlusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  } else {
    icon = <MinusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  }
  return (
    <>
      {!isCollapsed ? (
        <div className="p-1 m-1 bg-white border rounded object-display">
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <KVDisplay label="x">
            <FloatDisplay value={ value.x } />
          </KVDisplay>
          <KVDisplay label="y">
            <FloatDisplay value={ value.y } />
          </KVDisplay>
        </div>
      ) : (
        <div className="p-1 m-1 bg-white border rounded object-display">
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <span className="text-sm italic text-gray-500"> object collapsed</span>
        </div>
      )}
    </>
  );
}

function PlayerDisplay({ value, isCollapsible }: { value: Player, isCollapsible: boolean  }) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  let icon;
  if (isCollapsed) {
    icon = <PlusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  } else {
    icon = <MinusSmIcon className="w-3 h-3 fill-current" aria-hidden="true" />;
  }
  return (
    <>
      {!isCollapsed ? (
        <div className="p-1 m-1 bg-white border rounded object-display">
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <KVDisplay label="paddle">
            <FloatDisplay value={ value.paddle } />
          </KVDisplay>
          <KVDisplay label="score">
            <IntDisplay value={ value.score } />
          </KVDisplay>
        </div>
      ) : (
        <div className="p-1 m-1 bg-white border rounded object-display">
          {isCollapsible && (
            <span className="align-middle mr-0.5">
              <button
                type="button"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="inline-flex items-center text-sm font-medium text-gray-700 bg-gray-100 border border-gray-700 rounded-md shadow-sm hover:bg-gray-200 hover:text-gray-900 hover:border-gray-900 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-indigo-500 disabled:opacity-50"
              >
                {icon}
              </button>
            </span>
          )}
          <span className="text-sm italic text-gray-500"> object collapsed</span>
        </div>
      )}
    </>
  );
}

export function State() {
  const { state: value } = useContext(RtagContext)!;
  return (
    <div className="w-full font-mono text-gray-700 state-display">
      <PluginDisplay value={value} component="player-state-plugin" isCollapsible={ false } />
    </div>
  );
}