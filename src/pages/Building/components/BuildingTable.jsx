import { push } from 'connected-react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFilters, usePagination, useTable, useSortBy } from 'react-table';
import { useDispatch, useSelector } from 'react-redux';
import { Pagination, Table } from 'semantic-ui-react';
import moment from 'moment';
import { querystringParamSelector } from 'store/selectors';
import BuildingStats from './BuildingStats';
import styles from './BuildingTable.module.css';

const RENT_TYPE_SUFFIX = {
  yearly: '/y',
  monthly: '/m',
  weekly: '/w',
  daily: '/d',
};

const columns = [
  {
    Header: 'Category',
    accessor: 'category',
    filter: 'equals',
  },
  {
    Header: 'Type',
    accessor: 'type',
    filter: 'equals',
  },
  {
    // Header: 'Type',
    accessor: 'rent_type',
    filter: 'equals',
  },
  {
    Header: 'Total price',
    Cell: ({ row: { original } }) => (
      <>
        {original.price.toLocaleString()} €
        {original.type === 'rent' && RENT_TYPE_SUFFIX[original.rent_type]}
      </>
    ),
    accessor: 'price',
  },
  {
    Header: 'SQM Price',
    Cell: ({ value }) => {
      if (!value) {
        return null;
      }

      return (
        <>
          {Math.round(value).toLocaleString()} €/m
          <sup>2</sup>
        </>
      );
    },
    accessor: 'price_per_sqm',
  },
  {
    Header: 'Area',
    Cell: ({ value }) => {
      if (!value) {
        return null;
      }

      return (
        <>
          {value.toLocaleString()} m<sup>2</sup>
        </>
      );
    },
    accessor: 'area',
  },
  {
    Header: 'Rooms',
    accessor: 'rooms',
  },
  {
    Header: 'Published at',
    Cell: ({ value }) =>
      value ? moment(value).format('YYYY-MM-DD HH:mm') : 'Before 2018',
    accessor: 'published_at',
  },
];

function getCellTextAlign(cell) {
  if (['category', 'type'].includes(cell.column.id)) {
    return 'left';
  }

  return 'right';
}

function mapFilters(filters) {
  return Object.entries(filters)
    .filter(([, value]) => !!value)
    .map(([id, value]) => ({ id, value }));
}

function getRowId(row) {
  return row.id;
}

function usePageSize() {
  const dispatch = useDispatch();

  const initialPageIndex = useSelector(querystringParamSelector('page')) || 1;
  const updatePageIndex = useCallback(
    (event, { activePage }) => {
      dispatch(push('?page=' + activePage));
    },
    [dispatch],
  );

  return [parseInt(initialPageIndex, 10) - 1, updatePageIndex];
}

export default function BuildingTable(props) {
  const [initialPageIndex, updatePageIndex] = usePageSize();
  const [initialFilters] = useState(() => mapFilters(props.filters));
  const {
    setFilter,
    headerGroups,
    rows,
    page,
    prepareRow,

    // Pagination
    pageCount,
    gotoPage,
    state: { pageIndex },
  } = useTable(
    {
      columns,
      data: props.building.properties.results,
      initialState: {
        sortBy: [
          {
            id: 'published_at',
            desc: true,
          },
        ],
        filters: initialFilters,
        pageSize: 15,
        pageIndex: initialPageIndex,
        hiddenColumns: ['rent_type'],
      },
      getRowId,
    },
    useFilters,
    useSortBy,
    usePagination,
  );

  const onPageChange = useCallback(
    (event, data) => {
      gotoPage(data.activePage - 1);
      updatePageIndex(event, data);
    },
    [gotoPage, updatePageIndex],
  );

  useEffect(() => {
    Object.entries(props.filters).forEach(([id, value]) =>
      setFilter(id, value),
    );
  }, [props.filters, setFilter]);

  const prices = useMemo(
    () => ({
      total: rows
        .map(({ original }) => original.price)
        .filter((price) => price > 0),
      sqm: rows
        .map(({ original }) => original.price_per_sqm)
        .filter((price) => price > 0),
    }),
    [rows],
  );

  const hasResults = page.length > 0;

  return (
    <>
      {hasResults && (
        <div className={styles.stats}>
          <BuildingStats prices={prices} />
        </div>
      )}
      <Table singleLine={hasResults} sortable>
        <Table.Header>
          {headerGroups.map((headerGroup) => (
            <Table.Row
              textAlign="center"
              {...headerGroup.getHeaderGroupProps()}
            >
              {headerGroup.headers.map((column) => (
                <Table.HeaderCell
                  {...column.getHeaderProps(column.getSortByToggleProps())}
                  sorted={
                    column.isSorted
                      ? column.isSortedDesc
                        ? 'descending'
                        : 'ascending'
                      : null
                  }
                >
                  {column.render('Header')}
                </Table.HeaderCell>
              ))}
            </Table.Row>
          ))}
        </Table.Header>

        <Table.Body>
          {page.map((row) => {
            prepareRow(row);
            return (
              <Table.Row {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <Table.Cell
                    textAlign={getCellTextAlign(cell)}
                    {...cell.getCellProps()}
                  >
                    {cell.render('Cell')}
                  </Table.Cell>
                ))}
              </Table.Row>
            );
          })}
          {!hasResults && (
            <Table.Row>
              <Table.Cell colSpan={columns.length} textAlign="center">
                <p>
                  <strong>
                    No classifieds could be found with the given filters.
                  </strong>{' '}
                  Clear the filters or open a different property to see data.
                </p>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>

        {pageCount > 1 && (
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell colSpan={columns.length}>
                <Pagination
                  activePage={pageIndex + 1}
                  boundaryRange={1}
                  onPageChange={onPageChange}
                  size="mini"
                  siblingRange={2}
                  totalPages={pageCount}
                />
              </Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        )}
      </Table>
    </>
  );
}
